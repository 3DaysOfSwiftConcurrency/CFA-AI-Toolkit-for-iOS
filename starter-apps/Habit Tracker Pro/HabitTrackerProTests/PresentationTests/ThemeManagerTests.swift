import Foundation
import SwiftUI
import UIKit
import Testing
@testable import HabitTrackerPro

@MainActor
struct ThemeManagerTests {
    @Test func sevenPalettesAndSeparateAutomaticMode() {
        #expect(AppColourTheme.all.count == 7)
        #expect(Set(AppColourTheme.all.map(\.id)).count == 7)
        #expect(AppColourTheme.all.contains { $0.colorScheme == .light })
        #expect(AppColourTheme.all.contains { $0.colorScheme == .dark })
        #expect(AppColourTheme.availableThemes.count == 8)
        #expect(AppColourTheme.automatic.colorScheme == nil)
    }

    @Test func managerSelectionDrivesThemeAndUnknownIdentifiersFollowSystem() throws {
        let suite = "ThemeManagerTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let themeManager = ThemeManager(defaults: defaults)
        #expect(themeManager.selectedTheme.id == "automatic")
        for palette in AppColourTheme.availableThemes {
            let selection = try #require(ThemeSelection(rawValue: palette.id))
            themeManager.selection = selection
            #expect(themeManager.selectedTheme.id == palette.id)
            #expect(ThemeManager(defaults: defaults).selection == selection)
        }
        themeManager.selection = .automatic
        #expect(themeManager.selectedTheme.colorScheme == nil)
        defaults.set("obsolete-theme", forKey: "selectedTheme")
        #expect(ThemeManager(defaults: defaults).selection == .automatic)
        // Existing installations keep their recognised choices.
        for legacyID in ["light", "dark"] {
            defaults.set(legacyID, forKey: "selectedTheme")
            #expect(ThemeManager(defaults: defaults).selection.rawValue == legacyID)
        }
    }

    @Test func automaticResolvesEverySemanticColourForCurrentTraits() {
        let colours: [KeyPath<AppColourTheme, Color>] = [
            \.background, \.surface, \.primaryText, \.secondaryText,
            \.tint, \.onTint, \.separator
        ]
        for style in [UIUserInterfaceStyle.light, .dark, .light] {
            let traits = UITraitCollection(userInterfaceStyle: style)
            let expected = style == .dark ? AppColourTheme.defaultDark : .defaultLight
            for colour in colours {
                let actual = UIColor(AppColourTheme.automatic[keyPath: colour]).resolvedColor(with: traits)
                let reference = UIColor(expected[keyPath: colour]).resolvedColor(with: traits)
                #expect(actual == reference)
            }
        }
        // A fixed palette is not replaced by the Automatic default on trait changes.
        let manual = UIColor(AppColourTheme.plum.background)
        #expect(manual.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light))
            == manual.resolvedColor(with: UITraitCollection(userInterfaceStyle: .dark)))
    }
}
