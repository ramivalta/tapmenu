import SwiftUI

/// Navigation and the ambient/interactive split.
///
/// The display spends almost all its time on the menu. Anyone who wanders off
/// into a beer or the catalogue and puts the remote down should find it back
/// on the menu later, so inactivity unwinds the stack.
struct RootView: View {
    @Environment(MenuStore.self) private var store

    @State private var path: [Route] = []
    @State private var lastActivity = Date.now

    /// Long enough to read a hop bill without being kicked out, short enough
    /// that the wall display is never left on a detail screen overnight.
    private let idleTimeout: TimeInterval = 90

    enum Route: Hashable {
        case beer(Beer)
        case catalogue
    }

    var body: some View {
        NavigationStack(path: $path) {
            MenuScreen(onOpen: open, onOpenCatalogue: { push(.catalogue) })
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .beer(let beer):
                        BeerDetailScreen(beer: beer)
                    case .catalogue:
                        CatalogueScreen(onOpen: open)
                    }
                }
        }
        .task { await store.pollForever() }
        // Never let tvOS sleep the display or start a screensaver.
        .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
        // Any navigation counts as activity, so the timeout measures genuine
        // idleness rather than time-since-arrival.
        .onChange(of: path) { lastActivity = .now }
        .task(id: path.isEmpty) { await watchForIdle() }
    }

    private func open(_ beer: Beer) { push(.beer(beer)) }

    private func push(_ route: Route) {
        lastActivity = .now
        path.append(route)
    }

    /// Only runs while something is on the stack — the menu itself has nothing
    /// to return to.
    private func watchForIdle() async {
        guard !path.isEmpty else { return }
        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(5))
            if Date.now.timeIntervalSince(lastActivity) > idleTimeout {
                withAnimation { path.removeAll() }
                return
            }
        }
    }
}
