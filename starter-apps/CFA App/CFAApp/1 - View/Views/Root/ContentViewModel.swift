import Observation

@MainActor
@Observable
final class ContentViewModel {
    var selectedTab: Tab = .home

    enum Tab: Hashable {
        case home
        case settings
    }
}
