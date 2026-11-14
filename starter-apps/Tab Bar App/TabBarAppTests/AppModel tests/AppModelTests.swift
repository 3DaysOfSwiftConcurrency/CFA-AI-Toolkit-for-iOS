import Foundation
import Testing
@testable import TabBarApp

@MainActor
struct AppModelTests {
    @Test func composesTheHomeAndSettingsFeatures() {
        let defaults = UserDefaults(suiteName: "AppModelTests-\(UUID().uuidString)")!
        let model = AppModel(homeFeature: HomeFeature(), settingsFeature: SettingsFeature(defaults: defaults))

        #expect(model.homeFeature.starterSteps.count == 3)
        #expect(model.settingsFeature.selectedTheme == .automatic)
    }
}
