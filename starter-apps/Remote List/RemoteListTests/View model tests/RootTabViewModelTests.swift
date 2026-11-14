import Testing
@testable import RemoteList

@Suite("Root navigation") @MainActor
struct RootTabViewModelTests {
    @Test func startsOnRemoteList() {
        let viewModel = RootTabViewModel()
        #expect(viewModel.selectedTab == .remoteList)
        viewModel.selectedTab = .settings
        #expect(viewModel.selectedTab == .settings)
    }
}
