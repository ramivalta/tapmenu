import Foundation
import Observation

/// Holds the menu and keeps it fresh.
///
/// The display runs unattended, so a failed refresh must never blank the
/// screen: the last good payload stays on screen and the failure is recorded
/// separately for a discreet indicator.
@MainActor
@Observable
final class MenuStore {
    private(set) var menu: TapMenu?
    private(set) var archive: Archive?
    private(set) var lastError: String?
    private(set) var lastLoaded: Date?

    /// How often to re-poll. The menu changes when a keg does, so this is
    /// about being eventually correct, not instant.
    private let refreshInterval: Duration = .seconds(60)

    var isLoaded: Bool { menu != nil }

    func refresh() async {
        do {
            menu = try await MenuAPI.menu()
            lastError = nil
            lastLoaded = .now
        } catch {
            // Keep the previous menu on screen.
            lastError = error.localizedDescription
        }
    }

    /// Loaded lazily — the catalogue is only needed once someone opens it.
    func loadArchiveIfNeeded() async {
        guard archive == nil else { return }
        do {
            archive = try await MenuAPI.archive()
        } catch {
            lastError = error.localizedDescription
        }
    }

    /// Drives the poll loop for as long as the view that started it lives.
    func pollForever() async {
        while !Task.isCancelled {
            await refresh()
            try? await Task.sleep(for: refreshInterval)
        }
    }
}
