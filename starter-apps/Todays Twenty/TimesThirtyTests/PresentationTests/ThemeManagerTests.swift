import Foundation
import Testing
@testable import TimesThirty

@MainActor
struct ThemeManagerTests {
    @Test func reflectsItsOwnThemeSelection() throws {
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let themeManager = ThemeManager(defaults: defaults)
        #expect(themeManager.selectedTheme == .automatic)
        themeManager.selectedTheme = .plum
        #expect(themeManager.selectedTheme == .plum)
        #expect(themeManager.current.colorScheme == .dark)
    }
}
