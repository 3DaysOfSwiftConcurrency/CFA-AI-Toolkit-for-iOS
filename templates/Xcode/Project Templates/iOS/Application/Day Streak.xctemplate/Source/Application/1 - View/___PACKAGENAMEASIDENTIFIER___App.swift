import SwiftUI

@main
struct ___PACKAGENAMEASIDENTIFIER___App: App {
    @State private var themeManager = ThemeManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(themeManager)
        }
    }
}
