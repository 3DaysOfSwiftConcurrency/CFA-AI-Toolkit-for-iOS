import Observation

@MainActor
@Observable
final class RootTabViewModel {
    var selectedTab: Tab = .remoteList

    enum Tab: Hashable {
        case remoteList
        case settings
    }
}
