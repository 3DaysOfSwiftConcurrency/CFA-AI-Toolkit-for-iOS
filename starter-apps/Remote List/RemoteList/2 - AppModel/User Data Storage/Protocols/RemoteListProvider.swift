import Foundation

/// The small provider boundary lets RemoteListFeature be tested without making a real network request.
protocol RemoteListProvider: Sendable {
    func fetchRepos() async throws -> [RemoteListResponse]
}

/// The local cache returns only feature domain values.
protocol RepoCache: Sendable {
    func loadRepos() async throws -> [Repo]
    func saveRepos(_ repos: [Repo]) async throws
}
