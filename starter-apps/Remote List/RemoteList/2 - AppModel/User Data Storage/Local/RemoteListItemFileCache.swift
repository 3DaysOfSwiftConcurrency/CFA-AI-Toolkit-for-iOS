import Foundation

actor RemoteListItemFileCache: RemoteListItemCache {
    private let cacheFileURL: URL

    init(cacheDirectoryURL: URL) {
        cacheFileURL = cacheDirectoryURL.appending(path: "remote-list-items.json")
    }

    func loadItems() throws -> [RemoteListItem] {
        guard FileManager.default.fileExists(atPath: cacheFileURL.path()) else {
            return []
        }

        let data = try Data(contentsOf: cacheFileURL)
        return try JSONDecoder().decode([RemoteListItem].self, from: data)
    }

    func saveItems(_ items: [RemoteListItem]) throws {
        let data = try JSONEncoder().encode(items)
        try FileManager.default.createDirectory(at: cacheFileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: cacheFileURL, options: .atomic)
    }
}
