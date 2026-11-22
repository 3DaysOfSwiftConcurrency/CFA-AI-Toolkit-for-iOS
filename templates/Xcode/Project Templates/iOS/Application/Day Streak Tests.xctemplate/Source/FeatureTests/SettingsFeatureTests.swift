import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@MainActor
struct SettingsFeatureTests {
    @Test func preferencesPersist() throws {
        let name = "___PROJECTNAME:identifier___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults)
        #expect(feature.preferredDifficulty == .everyday)
        feature.selectDifficulty(.challenge)
        #expect(SettingsFeature(defaults: defaults).preferredDifficulty == .challenge)
        defaults.set("obsolete", forKey: "preferredDifficulty")
        #expect(SettingsFeature(defaults: defaults).preferredDifficulty == .everyday)
    }
}
