import Foundation

@MainActor
final class AppModel {
    static let shared = AppModel.live()

    let remoteListFeature: RemoteListFeature
    private var hasFinishedLaunching: Bool

    init(remoteListFeature: RemoteListFeature) {
        self.remoteListFeature = remoteListFeature
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
                cache: RemoteListItemFileCache(cacheDirectoryURL: .cachesDirectory)
            )
        )
    }
}
