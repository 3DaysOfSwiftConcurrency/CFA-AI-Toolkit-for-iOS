import Foundation
import Testing
@testable import RemoteList

@Suite("Application composition", .timeLimit(.minutes(1))) @MainActor
struct AppModelTests {
    @Test func initializerUsesIsolatedFeatures() throws {
        let name = "CFACompositionTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let remoteListFeature = RemoteListFeature(provider: TestRemoteListProvider(), cache: TestRemoteListItemCache())
        let settingsFeature = SettingsFeature(defaults: defaults)
        let appModel = AppModel(remoteListFeature: remoteListFeature, settingsFeature: settingsFeature)
        #expect(appModel.remoteListFeature === remoteListFeature)
        #expect(appModel.settingsFeature === settingsFeature)
    }

    @Test func repeatedLaunchStartsOneSharedRefresh() async throws {
        let name = "CFACompositionTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let launchProvider = LaunchProvider()
        let remoteListFeature = RemoteListFeature(provider: launchProvider, cache: TestRemoteListItemCache())
        let appModel = AppModel(remoteListFeature: remoteListFeature,
                                settingsFeature: SettingsFeature(defaults: defaults))
        appModel.applicationDidFinishLaunching()
        await launchProvider.waitUntilStarted()
        appModel.applicationDidFinishLaunching()
        #expect(await launchProvider.callCount == 1)
        var hasJoinedRefresh = false
        let refreshWaiter = Task { @MainActor in
            hasJoinedRefresh = true
            await remoteListFeature.refresh()
        }
        while !hasJoinedRefresh { await Task.yield() }
        await launchProvider.release()
        await refreshWaiter.value
        appModel.applicationDidFinishLaunching()
        #expect(!remoteListFeature.isRefreshing)
        #expect(await launchProvider.callCount == 1)
    }

}


private actor LaunchProvider: RemoteListProvider {
    private(set) var callCount = 0
    private var started: CheckedContinuation<Void, Never>?
    private var gate: CheckedContinuation<Void, Never>?

    func fetchItems() async throws -> [RemoteListResponse] {
        callCount += 1
        started?.resume(); started = nil
        await withCheckedContinuation { gate = $0 }
        return []
    }
    func waitUntilStarted() async {
        if callCount > 0 { return }
        await withCheckedContinuation { started = $0 }
    }
    func release() { gate?.resume(); gate = nil }
}
