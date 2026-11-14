import Foundation
import Observation

@MainActor
@Observable
final class RemoteListFeature {
    @ObservationIgnored private var refreshTask: Task<Void, Never>?
    @ObservationIgnored private var cacheRestoreTask: Task<Void, Never>?
    @ObservationIgnored private var cacheWriteTask: Task<Void, Never>?
    @ObservationIgnored private var cacheWriteID: UUID?
    @ObservationIgnored private var didStartCacheRestore = false
    @ObservationIgnored private var hasFreshResponse = false
    private let provider: any RemoteListProvider
    private let cache: any RemoteListItemCache

    private(set) var items: [RemoteListItem] = []
    private(set) var isRefreshing = false
    private(set) var refreshError: (any Error)?

    init(provider: any RemoteListProvider, cache: any RemoteListItemCache) {
        self.provider = provider
        self.cache = cache
    }

    // Schedule refresh before cache restoration; either task may begin first.
    func startLoading() {
        _ = startRefreshIfNeeded()
        startCacheRestoreIfNeeded()
    }

    func refresh() async {
        let task = startRefreshIfNeeded()
        startCacheRestoreIfNeeded()
        await task.value
    }

    private func startRefreshIfNeeded() -> Task<Void, Never> {
        if let refreshTask { return refreshTask }
        isRefreshing = true
        refreshError = nil
        let task = Task { @MainActor in
            defer { isRefreshing = false; refreshTask = nil }
            do {
                let response = try await provider.fetchItems()
                let downloaded = response.map(RemoteListItem.init(response:))
                items = downloaded
                hasFreshResponse = true
                refreshError = nil
                saveCacheInBackground(downloaded)
            } catch is CancellationError {
                return
            } catch {
                refreshError = error
            }
        }
        refreshTask = task
        return task
    }

    private func startCacheRestoreIfNeeded() {
        guard !didStartCacheRestore else { return }
        didStartCacheRestore = true
        cacheRestoreTask = Task { @MainActor in
            defer { cacheRestoreTask = nil }
            guard let saved = try? await cache.loadItems(), !hasFreshResponse else { return }
            items = saved
        }
    }

    // Preserve write order so an older snapshot cannot replace a newer one.
    private func saveCacheInBackground(_ snapshot: [RemoteListItem]) {
        let previous = cacheWriteTask
        let id = UUID()
        let task = Task { @MainActor in
            await previous?.value
            defer {
                if cacheWriteID == id { cacheWriteTask = nil; cacheWriteID = nil }
            }
            for _ in 0..<2 {
                do { try await cache.saveItems(snapshot); return }
                catch { /* The remote response is already available. */ }
            }
        }
        cacheWriteTask = task
        cacheWriteID = id
    }
}
