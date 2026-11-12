import Testing
@testable import CFABlank

@MainActor
struct ContentViewModelTests {
    @Test func presentsFirstFeatureGuidance() {
        #expect(ContentViewModel().message.contains("feature"))
    }
}
