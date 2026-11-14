import SwiftUI

struct RootTabView: View {
    @State private var viewModel = RootTabViewModel()

    var body: some View {
        TabView(selection: $viewModel.selectedTab) {
            RemoteListView()
                .tabItem { Label("Remote List", systemImage: "chevron.left.forwardslash.chevron.right") }
                .tag(RootTabViewModel.Tab.remoteList)

            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(RootTabViewModel.Tab.settings)
        }
    }
}
