import Foundation

/// The small provider boundary lets RemoteListFeature be tested without making a real network request.
protocol RemoteListProvider: Sendable {
    func fetchItems() async throws -> [RemoteListResponse]
}

/// The local cache returns only feature domain values.
protocol RemoteListItemCache: Sendable {
    func loadItems() async throws -> [RemoteListItem]
    func saveItems(_ items: [RemoteListItem]) async throws
}
