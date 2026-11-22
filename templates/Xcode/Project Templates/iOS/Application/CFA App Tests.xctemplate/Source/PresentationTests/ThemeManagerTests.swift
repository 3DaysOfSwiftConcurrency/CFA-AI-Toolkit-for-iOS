import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("ThemeManager")
@MainActor
struct ThemeManagerTests {
    @Test func selectionPersistsAndRestores() throws {
        let defaults = try #require(UserDefaults(suiteName: UUID().uuidString))
        let themeManager = ThemeManager(defaults: defaults)
        #expect(themeManager.selection == .automatic)

        themeManager.selection = .dark
        #expect(defaults.string(forKey: "selectedTheme") == "dark")
        #expect(themeManager.selectedTheme.colorScheme == .dark)
        #expect(ThemeManager(defaults: defaults).selection == .dark)
    }
}
