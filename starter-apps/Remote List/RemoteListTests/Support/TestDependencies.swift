import Foundation
@testable import RemoteList

actor TestRemoteListProvider: RemoteListProvider {
    let remoteListResponses: [RemoteListResponse]
    init(remoteListResponses: [RemoteListResponse] = []) {
        self.remoteListResponses = remoteListResponses
    }
    func fetchRepos() -> [RemoteListResponse] { remoteListResponses }
}

private enum TestNetworkError: Error { case unavailable }

actor FailingRemoteListProvider: RemoteListProvider {
    func fetchRepos() throws -> [RemoteListResponse] { throw TestNetworkError.unavailable }
}

actor ChangingRemoteListProvider: RemoteListProvider {
    private let repos: [RemoteListResponse]
    private var shouldFail = false

    init(repos: [RemoteListResponse]) { self.repos = repos }
    func failNextRequests() { shouldFail = true }
    func fetchRepos() throws -> [RemoteListResponse] {
        if shouldFail { throw TestNetworkError.unavailable }
        return repos
    }
}

actor TestRepoCache: RepoCache {
    private var stored: [Repo] = []
    func loadRepos() -> [Repo] { stored }
    func saveRepos(_ repos: [Repo]) { stored = repos }
}
