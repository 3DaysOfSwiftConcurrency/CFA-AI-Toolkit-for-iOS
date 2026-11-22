import Foundation

@MainActor
final class AppModel {
    static let shared = AppModel.live()

    private var didFinishLaunching: Bool

    init() {
        didFinishLaunching = false
    }

    static func live() -> AppModel {
        AppModel()
    }

    func applicationDidFinishLaunching() async {
        guard !didFinishLaunching else { return }
        didFinishLaunching = true
    }
}
