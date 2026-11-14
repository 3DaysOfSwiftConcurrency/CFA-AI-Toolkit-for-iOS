import Testing
@testable import CFAApp

@MainActor
struct HomeViewModelTests {
    @Test func presentsStepsOwnedByHomeFeature() {
        let feature = HomeFeature()
        let viewModel = HomeViewModel(homeFeature: feature)

        #expect(viewModel.starterSteps == feature.starterSteps)
    }
}
