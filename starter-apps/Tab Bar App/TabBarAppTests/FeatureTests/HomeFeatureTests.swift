import Testing
@testable import TabBarApp

@MainActor
struct HomeFeatureTests {
    @Test func publishesACompleteStartingChecklist() {
        let feature = HomeFeature()

        #expect(feature.starterSteps.count == 3)
        #expect(feature.starterSteps.contains("Define the first user journey."))
    }
}
