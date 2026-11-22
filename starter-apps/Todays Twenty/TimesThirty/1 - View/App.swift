import SwiftUI

@main
struct TimesThirtyApp: App {
    @State private var themeManager = ThemeManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(themeManager)
        }
    }
}
