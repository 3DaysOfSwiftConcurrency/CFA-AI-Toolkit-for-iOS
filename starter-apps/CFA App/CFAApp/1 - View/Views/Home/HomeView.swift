import SwiftUI

struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        NavigationStack {
            List {
                Section("Your first CFA feature") {
                    ForEach(viewModel.starterSteps, id: \.self) { step in
                        Label(step, systemImage: "checkmark.circle")
                    }
                }
            }
            .navigationTitle("Start Building")
            .scrollContentBackground(.hidden)
            .background(themeManager.selectedTheme.background)
        }
    }
}
