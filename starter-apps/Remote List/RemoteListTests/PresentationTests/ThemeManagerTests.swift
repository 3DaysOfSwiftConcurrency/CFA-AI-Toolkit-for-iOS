import Foundation
import Testing
@testable import RemoteList

@MainActor
struct ThemeManagerTests {
    @Test func selectionPersistsAndRestores() throws {
        let suite = "ThemeManagerTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let themeManager = ThemeManager(defaults: defaults)
        #expect(themeManager.selectedTheme == .automatic)
        themeManager.selectedTheme = .forest
        #expect(defaults.string(forKey: "selectedColourTheme") == "forest")
        #expect(ThemeManager(defaults: defaults).selectedTheme == .forest)
        defaults.set("obsolete", forKey: "selectedColourTheme")
        #expect(ThemeManager(defaults: defaults).selectedTheme == .automatic)
    }
}
