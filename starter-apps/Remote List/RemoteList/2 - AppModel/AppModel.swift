import Foundation

@MainActor
final class AppModel {
    static let shared = AppModel.live()

    let remoteListFeature: RemoteListFeature
    let settingsFeature: SettingsFeature
    private var hasFinishedLaunching: Bool

    init(remoteListFeature: RemoteListFeature, settingsFeature: SettingsFeature) {
        self.remoteListFeature = remoteListFeature
        self.settingsFeature = settingsFeature
        hasFinishedLaunching = false
    }

    func applicationDidFinishLaunching() {
        guard !hasFinishedLaunching else { return }
        hasFinishedLaunching = true

        remoteListFeature.startLoading()
    }

    static func live() -> AppModel {
        let networkingManager = NetworkingManager()
        return AppModel(
            remoteListFeature: RemoteListFeature(
                provider: RemoteListAPI(networkingManager: networkingManager),
                cache: RepoFileCache(cacheDirectoryURL: .cachesDirectory)
            ),
            settingsFeature: SettingsFeature()
        )
    }
}
