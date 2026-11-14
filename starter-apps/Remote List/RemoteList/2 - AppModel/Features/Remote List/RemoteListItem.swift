import Foundation

nonisolated struct RemoteListItem: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let title: String
    let summary: String?

    init(id: Int, title: String, summary: String?) {
        self.id = id
        self.title = title
        self.summary = summary
    }

    init(response: RemoteListResponse) {
        self.init(
            id: response.id,
            title: response.title,
            summary: response.summary
        )
    }

}
