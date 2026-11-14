import Foundation
import Observation

@MainActor
@Observable
final class RemoteListViewModel {
    private let remoteListFeature: RemoteListFeature

    init(remoteListFeature: RemoteListFeature = AppModel.shared.remoteListFeature) {
        self.remoteListFeature = remoteListFeature
    }

    var items: [RemoteListItem] {
        remoteListFeature.items
    }

    var isRefreshing: Bool {
        remoteListFeature.isRefreshing
    }

    func summary(for item: RemoteListItem) -> String {
        item.summary ?? "No description is available."
    }

    var refreshFailureMessage: String? {
        remoteListFeature.refreshError == nil ? nil : "Could not refresh items. Please try again."
    }

    @ObservationIgnored private var refreshTask: Task<Void, Never>?

    @discardableResult
    func refresh() -> Task<Void, Never> {
        if let refreshTask { return refreshTask }
        let task = Task { [weak self, remoteListFeature] in
            defer { self?.refreshTask = nil }
            await remoteListFeature.refresh()
        }
        refreshTask = task
        return task
    }
}
