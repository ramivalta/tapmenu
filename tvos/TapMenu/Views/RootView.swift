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
        ZStack {
            TaproomBackdrop()
            stack
        }
        .task { await store.pollForever() }
        // Never let tvOS sleep the display or start a screensaver.
        .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
        .onChange(of: path) { lastActivity = .now }
        .task(id: path.isEmpty) { await watchForIdle() }
    }

    private var stack: some View {
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
        while true {
            do {
                try await Task.sleep(for: .seconds(5))
            } catch {
                return  // cancelled: never act on a stale activity timestamp
            }
            if Date.now.timeIntervalSince(lastActivity) > idleTimeout {
                withAnimation { path.removeAll() }
                return
            }
        }
    }
}
