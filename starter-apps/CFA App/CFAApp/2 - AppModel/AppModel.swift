import Foundation

@MainActor
final class AppModel {
    static let shared = AppModel.live()

    let homeFeature: HomeFeature
    let settingsFeature: SettingsFeature
    private var didFinishLaunching = false

    init(homeFeature: HomeFeature, settingsFeature: SettingsFeature) {
        self.homeFeature = homeFeature
        self.settingsFeature = settingsFeature
    }

    static func live() -> AppModel {
        AppModel(homeFeature: HomeFeature(), settingsFeature: SettingsFeature(defaults: .standard))
    }

    func applicationDidFinishLaunching() {
        guard !didFinishLaunching else { return }
        didFinishLaunching = true
    }
}
