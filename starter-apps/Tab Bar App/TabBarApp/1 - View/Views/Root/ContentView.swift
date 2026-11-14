import SwiftUI

struct ContentView: View {
    @State private var viewModel = ContentViewModel()
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        TabView(selection: $viewModel.selectedTab) {
            Tab("Home", systemImage: "house", value: ContentViewModel.Tab.home) { HomeView() }
            Tab("Settings", systemImage: "gearshape", value: ContentViewModel.Tab.settings) { SettingsView() }
        }
        .tint(themeManager.selectedTheme.tint)
        .preferredColorScheme(themeManager.selectedTheme.colorScheme)
    }
}
