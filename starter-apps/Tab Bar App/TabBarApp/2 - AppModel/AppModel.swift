import Foundation

@MainActor
final class AppModel {
    static let shared = AppModel.live()

    let homeFeature: HomeFeature
    private var didFinishLaunching: Bool

    init(homeFeature: HomeFeature) {
        self.homeFeature = homeFeature
        didFinishLaunching = false
    }

    static func live() -> AppModel {
        AppModel(homeFeature: HomeFeature())
    }

    func applicationDidFinishLaunching() {
        guard !didFinishLaunching else { return }
        didFinishLaunching = true
    }
}
