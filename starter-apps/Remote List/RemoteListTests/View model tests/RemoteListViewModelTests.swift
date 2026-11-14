import Foundation
import Testing
@testable import RemoteList

@Suite("Git repositories screen") @MainActor
struct RemoteListViewModelTests {
    @Test func missingDescriptionGetsPresentationFallback() throws {
        let remoteListFeature = RemoteListFeature(provider: TestRemoteListProvider(), cache: TestRepoCache())
        let viewModel = RemoteListViewModel(remoteListFeature: remoteListFeature)
        let repositoryURL = try #require(URL(string: "https://example.org/repo"))
        let repository = Repo(id: 1, fullName: "Example/Repo", repositoryURL: repositoryURL,
                              summary: nil, stars: 0, updatedAt: .now)
        #expect(viewModel.summary(for: repository) == "No repository description.")
    }
    @Test func refreshFinishesAndExposesFeatureState() async {
        let remoteListFeature = RemoteListFeature(provider: TestRemoteListProvider(), cache: TestRepoCache())
        let viewModel = RemoteListViewModel(remoteListFeature: remoteListFeature)
        await viewModel.refresh().value
        #expect(viewModel.repos.isEmpty)
        #expect(!viewModel.isRefreshing)
        #expect(viewModel.refreshFailureMessage == nil)
    }

    @Test func refreshFailureHasReadableMessage() async {
        let remoteListFeature = RemoteListFeature(provider: FailingRemoteListProvider(), cache: TestRepoCache())
        let viewModel = RemoteListViewModel(remoteListFeature: remoteListFeature)
        await viewModel.refresh().value
        #expect(viewModel.refreshFailureMessage == "Could not refresh GitHub repositories. Please try again.")
    }

    @Test func repeatedRefreshesReuseOneScreenTask() async throws {
        let repositoryURL = try #require(URL(string: "https://example.org/repo"))
        let provider = HeldRemoteListProvider(repositoryURL: repositoryURL)
        let remoteListFeature = RemoteListFeature(provider: provider, cache: TestRepoCache())
        let viewModel = RemoteListViewModel(remoteListFeature: remoteListFeature)

        let firstRefresh = viewModel.refresh()
        let secondRefresh = viewModel.refresh()
        await provider.waitUntilRequestStarts()
        #expect(await provider.requestCount == 1)

        await provider.releaseRequest()
        await firstRefresh.value
        await secondRefresh.value
        #expect(viewModel.repos.map(\.id) == [1])
    }
}

private actor HeldRemoteListProvider: RemoteListProvider {
    private let repositoryURL: URL
    private var requestStarted: CheckedContinuation<Void, Never>?
    private var requestRelease: CheckedContinuation<Void, Never>?
    private(set) var requestCount = 0

    init(repositoryURL: URL) {
        self.repositoryURL = repositoryURL
    }

    func fetchRepos() async throws -> [RemoteListResponse] {
        requestCount += 1
        requestStarted?.resume()
        requestStarted = nil
        await withCheckedContinuation { requestRelease = $0 }
        return [
            RemoteListResponse(
                id: 1,
                fullName: "Example/Repo",
                repositoryURL: repositoryURL,
                description: nil,
                stars: 0,
                updatedAt: .now
            )
        ]
    }

    func waitUntilRequestStarts() async {
        if requestCount > 0 { return }
        await withCheckedContinuation { requestStarted = $0 }
    }

    func releaseRequest() {
        requestRelease?.resume()
        requestRelease = nil
    }
}
