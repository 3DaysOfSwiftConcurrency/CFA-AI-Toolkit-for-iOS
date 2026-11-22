import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("AppModel")
@MainActor
struct AppModelTests {
    @Test func compositionRootIsStable() {
        #expect(AppModel.shared === AppModel.shared)
    }
}
