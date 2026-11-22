import SwiftUI

struct SettingsView: View {
    @State private var viewModel = SettingsViewModel()
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Colour theme", selection: Binding(
                    get: { themeManager.selection },
                    set: { viewModel.selectTheme($0, using: themeManager) }
                )) {
                    ForEach(ThemeSelection.allCases) { selection in
                        Text(viewModel.title(for: selection)).tag(selection)
                    }
                }
                .pickerStyle(.menu)
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
