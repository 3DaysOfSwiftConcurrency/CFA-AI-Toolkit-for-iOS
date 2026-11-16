import SwiftUI
import UIKit

@main
struct ___PACKAGENAME:identifier___App: App {
    @UIApplicationDelegateAdaptor(ApplicationDelegate.self) private var applicationDelegate
    @State private var themeManager = ThemeManager()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(themeManager)
                .tint(themeManager.selectedTheme.tint)
                .preferredColorScheme(themeManager.selectedTheme.colorScheme)
        }
    }
}

final class ApplicationDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        Task { await AppModel.shared.applicationDidFinishLaunching() }
        return true
    }
}
