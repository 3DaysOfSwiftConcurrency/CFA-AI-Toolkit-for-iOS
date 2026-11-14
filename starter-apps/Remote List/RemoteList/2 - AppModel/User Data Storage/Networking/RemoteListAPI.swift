import Foundation

/// A deliberately small public JSON endpoint. Replace this type with the app's
/// own response model when adapting the starter to a real service.
actor RemoteListAPI: RemoteListProvider {
    private let networkingManager: NetworkingManager

    init(networkingManager: NetworkingManager) {
        self.networkingManager = networkingManager
    }

    func fetchItems() async throws -> [RemoteListResponse] {
        try Task.checkCancellation()
        guard let url = URL(string: "https://jsonplaceholder.typicode.com/posts") else {
            throw URLError(.badURL)
        }
        let data = try await networkingManager.data(from: url)

        return try JSONDecoder().decode([RemoteListResponse].self, from: data)
    }
}

nonisolated struct RemoteListResponse: Decodable, Sendable {
    let id: Int
    let title: String
    let summary: String?

    init(id: Int, title: String, summary: String?) {
        self.id = id
        self.title = title
        self.summary = summary
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case title
        case summary = "body"
    }
}
