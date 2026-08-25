import Foundation

/// `GET /api/tapmenu` — always four taps, empty ones carrying a nil beer.
struct TapMenu: Codable, Hashable, Sendable {
    let updatedAt: Date?
    let taps: [Tap]
}

struct Tap: Codable, Hashable, Sendable, Identifiable {
    let tapNumber: Int
    /// Nil when the tap is empty, so the card renders a placeholder.
    let beer: Beer?
    /// Hand-written pour note for this tap, independent of the beer.
    let notes: String?

    var id: Int { tapNumber }
}

/// `GET /api/tapmenu/archive` — the back catalogue, newest brew first.
struct Archive: Codable, Hashable, Sendable {
    let count: Int
    let limit: Int
    let beers: [Beer]
}

/// `GET /api/tapmenu/batches` — completed batches that can be put on a tap.
struct BatchList: Codable, Hashable, Sendable {
    let count: Int
    let batches: [AssignableBatch]
}

struct AssignableBatch: Codable, Hashable, Sendable, Identifiable {
    let id: String
    let name: String
    let style: String?
    let abv: Double?
    let ibu: Double?
    /// The tap this batch is already pouring on, if any.
    let onTap: Int?
}
