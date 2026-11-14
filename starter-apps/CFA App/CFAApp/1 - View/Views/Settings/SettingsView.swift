import SwiftUI

struct SettingsView: View {
    @State private var viewModel = SettingsViewModel()
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        NavigationStack {
            Form {
                Section("Appearance") {
                    Picker("Colour theme", selection: Binding(
                        get: { viewModel.selectedTheme },
                        set: { viewModel.selectTheme($0) }
                    )) {
                        ForEach(ThemeSelection.allCases) { theme in
                            Text(viewModel.title(for: theme)).tag(theme)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(minHeight: 48)
                }
                Section("About") {
                    LabeledContent("Architecture", value: "CFA iOS Architecture")
                    Text("Built with Cooperative Feature Architecture.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .scrollContentBackground(.hidden)
            .background(themeManager.selectedTheme.background)
        }
    }
}
