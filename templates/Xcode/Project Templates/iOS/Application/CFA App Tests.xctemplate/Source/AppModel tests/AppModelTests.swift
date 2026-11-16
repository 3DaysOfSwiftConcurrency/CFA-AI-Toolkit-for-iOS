import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("AppModel")
@MainActor
struct AppModelTests {
    @Test func retainsItsSettingsFeature() {
        let settingsFeature = SettingsFeature(defaults: .standard)
        let appModel = AppModel(settingsFeature: settingsFeature)

        #expect(appModel.settingsFeature === settingsFeature)
    }
}
