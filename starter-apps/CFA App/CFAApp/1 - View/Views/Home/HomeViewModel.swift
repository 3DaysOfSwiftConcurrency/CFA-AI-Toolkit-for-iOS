import Observation

@MainActor
@Observable
final class HomeViewModel {
    private let homeFeature: HomeFeature

    init(homeFeature: HomeFeature = AppModel.shared.homeFeature) {
        self.homeFeature = homeFeature
    }

    var starterSteps: [String] { homeFeature.starterSteps }
}
