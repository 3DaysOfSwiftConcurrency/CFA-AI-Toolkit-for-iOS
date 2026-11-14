import Testing
@testable import RemoteList

@Suite("Root navigation") @MainActor
struct RootTabViewModelTests {
    @Test func startsOnRepositories() {
        let viewModel = RootTabViewModel()
        #expect(viewModel.selectedTab == .gitRepos)
        viewModel.selectedTab = .settings
        #expect(viewModel.selectedTab == .settings)
    }
}
