import Foundation
import Testing
@testable import TabBarApp

@MainActor
struct ThemeManagerTests {
    @Test func selectionPersistsAndRestores() throws {
        let suite = "ThemeManagerTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let themeManager = ThemeManager(defaults: defaults)
        #expect(themeManager.selection == .automatic)
        themeManager.selection = .ocean
        #expect(defaults.string(forKey: "selectedTheme") == "ocean")
        #expect(ThemeManager(defaults: defaults).selection == .ocean)
        defaults.set("obsolete", forKey: "selectedTheme")
        #expect(ThemeManager(defaults: defaults).selection == .automatic)
    }
}
