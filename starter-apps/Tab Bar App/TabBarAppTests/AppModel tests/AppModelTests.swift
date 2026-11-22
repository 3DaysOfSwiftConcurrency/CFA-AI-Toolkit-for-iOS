import Foundation
import Testing
@testable import TabBarApp

@MainActor
struct AppModelTests {
    @Test func composesTheHomeFeature() {
        let model = AppModel(homeFeature: HomeFeature())

        #expect(model.homeFeature.starterSteps.count == 3)
    }
}
