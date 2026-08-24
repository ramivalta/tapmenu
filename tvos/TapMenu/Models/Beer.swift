import Foundation

/// One beer we brewed, as shaped by `/api/tapmenu` and `/api/tapmenu/archive`.
///
/// Deliberately the same model for both the current taps and the back
/// catalogue — the server returns an identical shape for each, so the detail
/// screen works the same whether a beer is pouring now or was archived in 2024.
struct Beer: Codable, Hashable, Sendable, Identifiable {
    let id: String?
    let name: String?
    let style: String?
    let abv: Double?
    let ibu: Double?
    let srm: Double?
    /// Hex from the SRM scale, e.g. `#EA8F00`.
    let color: String?
    let waveColor: WaveColor
    let brewedOn: Date?
    let keggedOn: Date?
    let untappd: Untappd?
    let hops: [HopGroup]
    let fermentables: [Fermentable]
    let yeasts: [Yeast]

    /// A non-optional, *stable* key for ForEach. Batch ids are always present
    /// in practice; the fallbacks must still be deterministic, since a fresh
    /// value each call would break list identity and re-animate every row.
    var stableID: String {
        id ?? name ?? "beer-\(brewedOn?.timeIntervalSince1970 ?? 0)"
    }

    struct WaveColor: Codable, Hashable, Sendable {
        let hue: Double
        let saturation: Double
        let lightness: Double
    }

    struct Untappd: Codable, Hashable, Sendable {
        let beerUrl: String
        let qrUrl: String

        /// The numeric beer id, taken from the QR redirect
        /// (`https://untappd.com/qr/beer/6775036`).
        var beerID: String? {
            let id = qrUrl.split(separator: "/").last.map(String.init)
            return id?.allSatisfy(\.isNumber) == true ? id : nil
        }
    }

    struct Hop: Codable, Hashable, Sendable {
        let name: String
        let amount: Double?
    }

    /// Hops for one point in the brew ("Boil", "Dry Hop"), pre-summed and
    /// ordered by the server so the client never re-derives the hop schedule.
    struct HopGroup: Codable, Hashable, Sendable, Identifiable {
        let use: String
        let hops: [Hop]
        var id: String { use }
    }

    struct Fermentable: Codable, Hashable, Sendable {
        let name: String
        let amount: Double?
    }

    struct Yeast: Codable, Hashable, Sendable {
        let name: String
        let productId: String?
    }
}
