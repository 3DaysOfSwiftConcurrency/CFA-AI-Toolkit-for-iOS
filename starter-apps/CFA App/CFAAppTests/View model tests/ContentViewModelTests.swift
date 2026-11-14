import Testing
@testable import CFAApp

@MainActor
struct ContentViewModelTests {
    @Test func startsOnHomeAndRetainsSelectedTab() {
        let viewModel = ContentViewModel()

        #expect(viewModel.selectedTab == .home)
        viewModel.selectedTab = .settings
        #expect(viewModel.selectedTab == .settings)
    }
}
