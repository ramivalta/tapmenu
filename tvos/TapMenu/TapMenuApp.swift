import SwiftUI

@main
struct TapMenuApp: App {
    @State private var store = MenuStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
        }
    }
}
