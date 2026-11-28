import UIKit

/// A refresh control that remains visible for at least `minimumVisibleDuration`.
///
/// It measures from when the control starts refreshing, never from when the
/// request completes. Callers use `beginRefreshing()` and `endRefreshing()` as
/// usual; no Feature or ViewModel needs a delay, clock, or scheduler.
@MainActor
public final class MinimumVisibleRefreshControl: UIRefreshControl {
  private let clock = ContinuousClock()
  private let minimumVisibleDuration: Duration
  private var visibleSince: ContinuousClock.Instant?
  private var pendingEnd: Task<Void, Never>?
  private var endID = UUID()

  public override init(frame: CGRect) {
    self.minimumVisibleDuration = .milliseconds(300)
    super.init(frame: frame)
    self.addTarget(self, action: #selector(refreshDidBegin), for: .valueChanged)
  }

  public init(frame: CGRect, minimumVisibleDuration: Duration) {
    self.minimumVisibleDuration = minimumVisibleDuration
    super.init(frame: frame)
    self.addTarget(self, action: #selector(refreshDidBegin), for: .valueChanged)
  }

  public required init?(coder: NSCoder) {
    self.minimumVisibleDuration = .milliseconds(300)
    super.init(coder: coder)
    self.addTarget(self, action: #selector(refreshDidBegin), for: .valueChanged)
  }

  public override func beginRefreshing() {
    cancelPendingEnd()
    super.beginRefreshing()
    recordVisibleStart()
  }

  public override func endRefreshing() {
    guard isRefreshing else {
      cancelPendingEnd()
      visibleSince = nil
      super.endRefreshing()
      return
    }
    guard pendingEnd == nil, let visibleSince else { return }
    let remaining = minimumVisibleDuration - visibleSince.duration(to: clock.now)
    guard remaining > .zero else {
      finishRefreshing()
      return
    }
    let id = UUID()
    endID = id
    pendingEnd = Task { [weak self] in
      do { try await Task.sleep(for: remaining) } catch { return }
      guard let self, !Task.isCancelled, self.endID == id else { return }
      self.pendingEnd = nil
      self.finishRefreshing()
    }
  }

  private func recordVisibleStart() {
    if visibleSince == nil { visibleSince = clock.now }
  }

  private func finishRefreshing() {
    cancelPendingEnd()
    visibleSince = nil
    super.endRefreshing()
  }

  private func cancelPendingEnd() {
    endID = UUID()
    pendingEnd?.cancel()
    pendingEnd = nil
  }

  @objc private func refreshDidBegin() {
    cancelPendingEnd()
    recordVisibleStart()
  }

  deinit { pendingEnd?.cancel() }
}
