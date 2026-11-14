import Foundation
import Testing
@testable import RemoteList

@Suite("Remote list screen") @MainActor
struct RemoteListViewModelTests {
    @Test func missingDescriptionGetsPresentationFallback() {
        let remoteListFeature = RemoteListFeature(provider: TestRemoteListProvider(), cache: TestRemoteListItemCache())
        let viewModel = RemoteListViewModel(remoteListFeature: remoteListFeature)
        let item = RemoteListItem(id: 1, title: "Example/RemoteListItem",
                              summary: nil)
        #expect(viewModel.summary(for: item) == "No description is available.")
    }
    @Test func refreshFinishesAndExposesFeatureState() async {
        let remoteListFeature = RemoteListFeature(provider: TestRemoteListProvider(), cache: TestRemoteListItemCache())
        let viewModel = RemoteListViewModel(remoteListFeature: remoteListFeature)
        await viewModel.refresh().value
        #expect(viewModel.items.isEmpty)
        #expect(!viewModel.isRefreshing)
        #expect(viewModel.refreshFailureMessage == nil)
    }

    @Test func refreshFailureHasReadableMessage() async {
        let remoteListFeature = RemoteListFeature(provider: FailingRemoteListProvider(), cache: TestRemoteListItemCache())
        let viewModel = RemoteListViewModel(remoteListFeature: remoteListFeature)
        await viewModel.refresh().value
        #expect(viewModel.refreshFailureMessage == "Could not refresh items. Please try again.")
    }

    @Test func repeatedRefreshesReuseOneScreenTask() async {
        let provider = HeldRemoteListProvider()
        let remoteListFeature = RemoteListFeature(provider: provider, cache: TestRemoteListItemCache())
        let viewModel = RemoteListViewModel(remoteListFeature: remoteListFeature)

        let firstRefresh = viewModel.refresh()
        let secondRefresh = viewModel.refresh()
        await provider.waitUntilRequestStarts()
        #expect(await provider.requestCount == 1)

        await provider.releaseRequest()
        await firstRefresh.value
        await secondRefresh.value
        #expect(viewModel.items.map(\.id) == [1])
    }
}

private actor HeldRemoteListProvider: RemoteListProvider {
    private var requestStarted: CheckedContinuation<Void, Never>?
    private var requestRelease: CheckedContinuation<Void, Never>?
    private(set) var requestCount = 0

    func fetchItems() async throws -> [RemoteListResponse] {
        requestCount += 1
        requestStarted?.resume()
        requestStarted = nil
        await withCheckedContinuation { requestRelease = $0 }
        return [
            RemoteListResponse(
                id: 1,
                title: "Example/RemoteListItem",
                summary: nil
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
