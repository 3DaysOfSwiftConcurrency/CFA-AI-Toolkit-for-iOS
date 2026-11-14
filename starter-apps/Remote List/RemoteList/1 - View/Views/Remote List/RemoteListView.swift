import SwiftUI

struct RemoteListView: View {
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme
    @State private var viewModel = RemoteListViewModel()

    var body: some View {
        let resolvedTheme = themeManager.selectedTheme.resolved(for: colorScheme)
        let palette = resolvedTheme.palette

        NavigationStack {
            Group {
                if viewModel.items.isEmpty, viewModel.isRefreshing {
                    ProgressView("Loading items…")
                        .tint(palette.tint)
                } else if viewModel.items.isEmpty, let message = viewModel.refreshFailureMessage {
                    failureCard(message, palette: palette)
                } else if viewModel.items.isEmpty {
                    ContentUnavailableView("No items available", systemImage: "tray")
                        .foregroundStyle(palette.primaryText)
                } else {
                    itemList(viewModel.items, palette: palette)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(palette.background)
            .navigationTitle("Remote List")
            .toolbarColorScheme(resolvedTheme.colorScheme, for: .navigationBar)
            .safeAreaInset(edge: .bottom) {
                if !viewModel.items.isEmpty, viewModel.isRefreshing {
                    ProgressView("Refreshing items…")
                        .tint(palette.tint)
                        .foregroundStyle(palette.primaryText)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(palette.surface)
                } else if !viewModel.items.isEmpty, let message = viewModel.refreshFailureMessage {
                    VStack(spacing: 8) {
                        Text(message)
                            .font(.footnote)
                        Button("Try again") { viewModel.refresh() }
                            .buttonStyle(.borderedProminent)
                            .tint(palette.tint)
                    }
                    .foregroundStyle(palette.primaryText)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(palette.surface)
                }
            }
        }
    }

    private func itemList(_ items: [RemoteListItem], palette: ThemePalette) -> some View {
        List(items, id: \.id) { item in
            VStack(alignment: .leading, spacing: 8) {
                Text(item.title)
                    .font(.headline)
                    .foregroundStyle(palette.primaryText)
                Text(viewModel.summary(for: item))
                    .font(.subheadline)
                    .foregroundStyle(palette.secondaryText)
            }
            .padding(.vertical, 6)
            .listRowBackground(palette.surface)
        }
        .scrollContentBackground(.hidden)
    }

    private func failureCard(_ message: String, palette: ThemePalette) -> some View {
        ContentUnavailableView {
            Label("Remote service unavailable", systemImage: "wifi.exclamationmark")
        } description: {
            Text(message)
        } actions: {
            Button("Try again") {
                viewModel.refresh()
            }
            .buttonStyle(.borderedProminent)
            .tint(palette.tint)
        }
        .foregroundStyle(palette.primaryText)
        .padding()
    }
}
