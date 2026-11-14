import Testing
@testable import TabBarApp

@MainActor
struct HomeViewModelTests {
    @Test func presentsStepsOwnedByHomeFeature() {
        let feature = HomeFeature()
        let viewModel = HomeViewModel(homeFeature: feature)

        #expect(viewModel.starterSteps == feature.starterSteps)
    }
}
