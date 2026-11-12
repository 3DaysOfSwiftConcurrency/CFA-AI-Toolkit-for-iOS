import Testing
@testable import CFABlank

@MainActor
struct AppModelTests {
    @Test func suppliesGuidanceWithoutProductFeatures() {
        #expect(!AppModel.shared.firstFeatureGuidance.isEmpty)
    }
}
