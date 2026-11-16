import Foundation

@MainActor
final class AppModel {
    static let shared = AppModel.live()

    let settingsFeature: SettingsFeature
    private var didFinishLaunching: Bool

    init(settingsFeature: SettingsFeature) {
        self.settingsFeature = settingsFeature
        didFinishLaunching = false
    }

    static func live() -> AppModel {
        AppModel(settingsFeature: SettingsFeature(defaults: .standard))
    }

    func applicationDidFinishLaunching() async {
        guard !didFinishLaunching else { return }
        didFinishLaunching = true
    }
}
