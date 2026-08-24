import Foundation

/// Check-in counts and rating for a beer, read off its public Untappd page.
///
/// There is no API access here, and the figures are not in any feed — but the
/// beer page is server-rendered, robots.txt permits fetching it, and the
/// numbers sit in plain markup.
///
/// This runs on the device rather than on the server, which is the opposite of
/// everything else in this app, for a concrete reason: Untappd fingerprints
/// clients below the header layer, and Node's HTTP stack gets a 403 with a
/// truncated page no matter what headers it sends. URLSession is not rejected.
/// The Apple TV also calls from a residential address, where the Vercel
/// deployment would be calling from a datacenter range.
///
/// Deliberately uncached: this is fetched when someone opens a beer's detail
/// screen, which happens a handful of times a day. Wiring it to the ambient
/// menu — four taps, polled every minute — would need caching first.
enum Untappd {
    struct Stats: Sendable, Equatable {
        let checkins: Int?
        let unique: Int?
        let monthly: Int?
        /// Untappd withholds a score until a beer clears its minimum number of
        /// ratings, reporting 0 until then. That is "unrated", not "rated 0".
        let rating: Double?
        let ratings: Int?

        var isWorthShowing: Bool { (checkins ?? 0) > 0 || rating != nil }
    }

    /// Untappd redirects any slug to the canonical one, so the id is enough.
    private static func url(for beerID: String) -> URL? {
        URL(string: "https://untappd.com/b/b/\(beerID)")
    }

    private static let userAgent =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        + "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

    static func stats(beerID: String) async -> Stats? {
        guard let url = url(for: beerID) else { return nil }

        var request = URLRequest(url: url)
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        request.timeoutInterval = 15
        request.cachePolicy = .reloadIgnoringLocalCacheData

        guard
            let (data, response) = try? await URLSession.shared.data(for: request),
            let http = response as? HTTPURLResponse,
            (200..<300).contains(http.statusCode)
        else {
            // Scraping is allowed to fail: the screen simply shows no figures.
            return nil
        }

        return parse(String(decoding: data, as: UTF8.self))
    }

    // MARK: - Parsing

    static func parse(_ html: String) -> Stats {
        let rating = number(in: html, pattern: #"data-rating="([\d.]+)""#)
            .flatMap(Double.init)
        return Stats(
            checkins: count(in: html, label: "Total"),
            unique: count(in: html, label: "Unique"),
            monthly: count(in: html, label: "Monthly"),
            rating: (rating ?? 0) > 0 ? rating : nil,
            ratings: number(in: html, pattern: #"class="raters"[^>]*>\s*([\d,]+)"#)
                .flatMap(int)
        )
    }

    /// The stats strip is `<span class="stat">Total (…)</span>
    /// <span class="count">7</span>`, with a tooltip link inside the label.
    private static func count(in html: String, label: String) -> Int? {
        let pattern =
            "<span class=\"stat\">\\s*\(label)\\b[\\s\\S]*?"
            + "<span class=\"count\">\\s*([\\d,]+)"
        return number(in: html, pattern: pattern).flatMap(int)
    }

    private static func int(_ text: String) -> Int? {
        Int(text.replacingOccurrences(of: ",", with: ""))
    }

    private static func number(in html: String, pattern: String) -> String? {
        guard
            let regex = try? NSRegularExpression(pattern: pattern),
            let match = regex.firstMatch(
                in: html,
                range: NSRange(html.startIndex..., in: html)
            ),
            let range = Range(match.range(at: 1), in: html)
        else {
            return nil
        }
        return String(html[range])
    }
}
