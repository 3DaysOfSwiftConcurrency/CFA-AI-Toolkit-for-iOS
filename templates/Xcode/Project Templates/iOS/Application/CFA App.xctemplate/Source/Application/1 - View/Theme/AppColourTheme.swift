import SwiftUI

enum ThemeSelection: String, CaseIterable, Identifiable {
    case automatic, light, dark
    var id: String { rawValue }
}

struct AppColourTheme {
    let tint: Color
    let background: Color
    let colorScheme: ColorScheme?

    init(selection: ThemeSelection) {
        switch selection {
        case .automatic:
            tint = .accentColor
            background = .clear
            colorScheme = nil
        case .light:
            tint = .blue
            background = .white
            colorScheme = .light
        case .dark:
            tint = .cyan
            background = .black
            colorScheme = .dark
        }
    }
}
