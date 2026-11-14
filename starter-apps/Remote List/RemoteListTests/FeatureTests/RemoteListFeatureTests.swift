import Foundation
import Observation
import Testing
@testable import RemoteList

@Suite("Remote list", .timeLimit(.minutes(1))) @MainActor
struct RemoteListFeatureTests {
    @Test func fileCacheRoundTripsAndRejectsCorruptData() async throws {
        let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString, directoryHint: .isDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }
        let cache = RemoteListItemFileCache(cacheDirectoryURL: directory)
        #expect(try await cache.loadItems().isEmpty)
        let item = RemoteListItem(id: 42, title: "Example/RemoteListItem",
                                  summary: "Example")
        try await cache.saveItems([item])
        #expect(try await cache.loadItems() == [item])
        let withoutDescription = RemoteListItem(id: 43, title: "Example/Other",
                                                summary: nil)
        try await cache.saveItems([item, withoutDescription])
        #expect(try await cache.loadItems() == [item, withoutDescription])
        try Data("invalid JSON".utf8).write(to: directory.appending(path: "remote-list-items.json"), options: .atomic)
        do {
            _ = try await cache.loadItems()
            Issue.record("Corrupt cache data should not decode successfully")
        } catch {
            // An optional cache failure can be ignored by the Feature.
        }
    }

    @Test func refreshPublishesProviderResults() async throws {
        let response = RemoteListResponse(id: 42, title: "Example/RemoteListItem",
                                          summary: nil)
        let feature = RemoteListFeature(provider: TestRemoteListProvider(remoteListResponses: [response]), cache: TestRemoteListItemCache())
        await feature.refresh()
        #expect(feature.items.map(\.id) == [42])
        #expect(feature.items.first?.summary == nil)
        #expect(feature.refreshError == nil)
        #expect(!feature.isRefreshing)
    }

    @Test func refreshFailureIsExposedAndLoadingFinishes() async {
        let feature = RemoteListFeature(provider: FailingRemoteListProvider(), cache: TestRemoteListItemCache())
        await feature.refresh()
        #expect(feature.refreshError != nil)
        #expect(!feature.isRefreshing)
    }

    @Test func failedRefreshStillRestoresAvailableCache() async throws {
        let cached = RemoteListItem(id: 42, title: "Example/RemoteListItem",
                          summary: "Saved snapshot")
        let cache = TestRemoteListItemCache()
        await cache.saveItems([cached])
        let feature = RemoteListFeature(provider: FailingRemoteListProvider(), cache: cache)
        let changes = AsyncStream<Void>.makeStream()
        withObservationTracking {
            _ = feature.items
        } onChange: {
            changes.continuation.yield(())
        }
        await feature.refresh()
        var iterator = changes.stream.makeAsyncIterator()
        _ = await iterator.next()
        #expect(feature.items == [cached])
        #expect(feature.refreshError != nil)
        #expect(!feature.isRefreshing)
        changes.continuation.finish()
    }

    @Test func failedRefreshKeepsPreviouslyLoadedResults() async throws {
        let response = RemoteListResponse(id: 42, title: "Example/RemoteListItem",
                                          summary: nil)
        let provider = ChangingRemoteListProvider(items: [response])
        let feature = RemoteListFeature(provider: provider, cache: TestRemoteListItemCache())
        await feature.refresh()
        await provider.failNextRequests()
        await feature.refresh()
        #expect(feature.items.map(\.id) == [42])
        #expect(feature.refreshError != nil)
        #expect(!feature.isRefreshing)
    }

    @Test func cacheWriteFailureDoesNotFailARefresh() async throws {
        let response = RemoteListResponse(id: 42, title: "Example/RemoteListItem",
                                          summary: nil)
        let cache = FailingRemoteListItemCache()
        let feature = RemoteListFeature(provider: TestRemoteListProvider(remoteListResponses: [response]), cache: cache)
        await feature.refresh()
        await cache.waitForAttempts()
        #expect(await cache.attempts == 2)
        #expect(feature.items.map(\.id) == [42])
        #expect(feature.refreshError == nil)
        #expect(!feature.isRefreshing)
    }

    @Test func refreshContinuesWhenItsOnlyCallerLeaves() async {
        let provider = GatedItemsProvider()
        let feature = RemoteListFeature(provider: provider, cache: TestRemoteListItemCache())
        let caller = Task { @MainActor in await feature.refresh() }
        await provider.waitForFirstRequest()
        caller.cancel()
        await provider.releaseFirstRequest()
        await caller.value
        #expect(await provider.calls == 1)
        #expect(feature.items.map(\.id) == [1])
        #expect(!feature.isRefreshing)
    }

    @Test func sharedRefreshAndOptionalCacheStayIndependent() async {
        let provider = GatedItemsProvider()
        let cache = GatedRemoteListItemCache()
        let feature = RemoteListFeature(provider: provider, cache: cache)
        feature.startLoading()
        await provider.waitForFirstRequest()
        await cache.waitForRestore()

        var entered = false
        let caller = Task { @MainActor in
            entered = true
            await feature.refresh()
        }
        while !entered { await Task.yield() }
        var secondEntered = false
        let secondCaller = Task { @MainActor in
            secondEntered = true
            await feature.refresh()
        }
        while !secondEntered { await Task.yield() }
        #expect(await provider.calls == 1)
        caller.cancel() // One screen leaving does not cancel another screen's shared request.
        await provider.releaseFirstRequest()
        await caller.value
        await secondCaller.value
        #expect(feature.items.map(\.id) == [1])
        #expect(!feature.isRefreshing)

        await cache.waitForFirstWrite()
        await cache.releaseRestore() // Old cached data arrives after the response.
        await feature.refresh()
        #expect(feature.items.map(\.id) == [2])
        await cache.releaseFirstWrite()
        await cache.waitForWrites()
        #expect(await cache.storedIDs == [1, 2])
        #expect(feature.items.map(\.id) == [2])
    }

}

// Controlled suspension makes request sharing and cache ordering observable.
private actor GatedItemsProvider: RemoteListProvider {
    private(set) var calls = 0
    private var started: CheckedContinuation<Void, Never>?
    private var release: CheckedContinuation<Void, Never>?

    func waitForFirstRequest() async {
        if calls > 0 { return }
        await withCheckedContinuation { started = $0 }
    }
    func releaseFirstRequest() { release?.resume(); release = nil }
    func fetchItems() async throws -> [RemoteListResponse] {
        calls += 1
        let id = calls
        if id == 1 {
            started?.resume(); started = nil
            await withCheckedContinuation { release = $0 }
        }
        return [RemoteListResponse(id: id, title: "item-\(id)", summary: nil)]
    }
}

private actor GatedRemoteListItemCache: RemoteListItemCache {
    private var restore: CheckedContinuation<[RemoteListItem], Error>?
    private var restoreStarted = false
    private var restoreWaiter: CheckedContinuation<Void, Never>?
    private var firstWrite: CheckedContinuation<Void, Never>?
    private var firstWriteStarted = false
    private var writeWaiter: CheckedContinuation<Void, Never>?
    private var finishWaiter: CheckedContinuation<Void, Never>?
    private(set) var storedIDs: [Int] = []

    func loadItems() async throws -> [RemoteListItem] {
        restoreStarted = true; restoreWaiter?.resume(); restoreWaiter = nil
        return try await withCheckedThrowingContinuation { restore = $0 }
    }
    func waitForRestore() async {
        if restoreStarted { return }
        await withCheckedContinuation { restoreWaiter = $0 }
    }
    func releaseRestore() {
        let old = RemoteListItem(id: 99, title: "old",
                       summary: "")
        restore?.resume(returning: [old]); restore = nil
    }
    func saveItems(_ items: [RemoteListItem]) async throws {
        if !firstWriteStarted {
            firstWriteStarted = true; writeWaiter?.resume(); writeWaiter = nil
            await withCheckedContinuation { firstWrite = $0 }
        }
        if let item = items.first { storedIDs.append(item.id) }
        if storedIDs.count == 2 { finishWaiter?.resume(); finishWaiter = nil }
    }
    func waitForFirstWrite() async {
        if firstWriteStarted { return }
        await withCheckedContinuation { writeWaiter = $0 }
    }
    func releaseFirstWrite() { firstWrite?.resume(); firstWrite = nil }
    func waitForWrites() async {
        if storedIDs.count == 2 { return }
        await withCheckedContinuation { finishWaiter = $0 }
    }
}

private actor FailingRemoteListItemCache: RemoteListItemCache {
    private(set) var attempts = 0
    private var waiter: CheckedContinuation<Void, Never>?

    func loadItems() -> [RemoteListItem] { [] }
    func saveItems(_ items: [RemoteListItem]) throws {
        attempts += 1
        if attempts == 2 { waiter?.resume(); waiter = nil }
        throw CocoaError(.fileWriteNoPermission)
    }
    func waitForAttempts() async {
        if attempts >= 2 { return }
        await withCheckedContinuation { waiter = $0 }
    }
}
