import Foundation
@testable import RemoteList

actor TestRemoteListProvider: RemoteListProvider {
    let remoteListResponses: [RemoteListResponse]
    init(remoteListResponses: [RemoteListResponse] = []) {
        self.remoteListResponses = remoteListResponses
    }
    func fetchItems() -> [RemoteListResponse] { remoteListResponses }
}

private enum TestNetworkError: Error { case unavailable }

actor FailingRemoteListProvider: RemoteListProvider {
    func fetchItems() throws -> [RemoteListResponse] { throw TestNetworkError.unavailable }
}

actor ChangingRemoteListProvider: RemoteListProvider {
    private let items: [RemoteListResponse]
    private var shouldFail = false

    init(items: [RemoteListResponse]) { self.items = items }
    func failNextRequests() { shouldFail = true }
    func fetchItems() throws -> [RemoteListResponse] {
        if shouldFail { throw TestNetworkError.unavailable }
        return items
    }
}

actor TestRemoteListItemCache: RemoteListItemCache {
    private var stored: [RemoteListItem] = []
    func loadItems() -> [RemoteListItem] { stored }
    func saveItems(_ items: [RemoteListItem]) { stored = items }
}
