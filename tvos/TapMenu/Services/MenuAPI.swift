import Foundation

/// Where the menu comes from.
///
/// Point this at the deployed Next app. For local iteration against
/// `next dev`, use your Mac's LAN name (`http://foo.local:3000`) rather than
/// localhost — the Apple TV is a different machine. Plain HTTP on the local
/// network is permitted by the ATS exception in TapMenu-Info.plist.
enum MenuAPI {
    static let baseURL = URL(string: "https://valta.beer")!

    // `Date.toISOString()` in Node always emits milliseconds
    // ("2026-08-17T17:18:13.000Z"), which the stock `.iso8601` strategy
    // rejects outright. Try fractional seconds first, then plain, so the
    // client survives either form.
    //
    // nonisolated(unsafe): ISO8601DateFormatter is documented as safe for
    // concurrent parsing, and these are never mutated after creation.
    nonisolated(unsafe) private static let isoFormatters: [ISO8601DateFormatter] = {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return [fractional, plain]
    }()

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let text = try decoder.singleValueContainer().decode(String.self)
            for formatter in isoFormatters {
                if let date = formatter.date(from: text) { return date }
            }
            throw DecodingError.dataCorrupted(
                .init(
                    codingPath: decoder.codingPath,
                    debugDescription: "Not an ISO-8601 date: \(text)"
                )
            )
        }
        return decoder
    }()

    private static func get<T: Decodable>(_ path: String, as type: T.Type) async throws -> T {
        var request = URLRequest(url: baseURL.appending(path: path))
        // The display polls; never serve it a stale cached body.
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw MenuError.badResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw MenuError.http(http.statusCode)
        }
        return try decoder.decode(type, from: data)
    }

    static func menu() async throws -> TapMenu {
        try await get("/api/tapmenu", as: TapMenu.self)
    }

    static func archive() async throws -> Archive {
        try await get("/api/tapmenu/archive", as: Archive.self)
    }
}

enum MenuError: LocalizedError {
    case badResponse
    case http(Int)

    var errorDescription: String? {
        switch self {
        case .badResponse: "Unexpected response from the brewery server"
        case .http(let code): "Brewery server returned HTTP \(code)"
        }
    }
}
