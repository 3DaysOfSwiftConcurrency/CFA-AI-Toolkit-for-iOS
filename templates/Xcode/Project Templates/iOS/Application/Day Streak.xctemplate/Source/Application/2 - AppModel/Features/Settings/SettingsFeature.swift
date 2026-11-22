import Foundation
import Observation

@MainActor @Observable
final class SettingsFeature {
    private static let preferredDifficultyStorageKey = "preferredDifficulty"
    private(set) var preferredDifficulty: Difficulty
    private let defaults: UserDefaults

    init(defaults: UserDefaults) {
        self.defaults = defaults
        preferredDifficulty = Difficulty(rawValue: defaults.string(forKey: Self.preferredDifficultyStorageKey) ?? "") ?? .everyday
    }

    func selectDifficulty(_ difficulty: Difficulty) {
        defaults.set(difficulty.rawValue, forKey: Self.preferredDifficultyStorageKey)
        preferredDifficulty = difficulty
    }
}
