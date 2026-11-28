import { spawnSync } from 'node:child_process';

function commandDetail(result) {
  return (result.stderr || result.stdout || '').trim();
}

/**
 * Delivers one already-reserved continuation to a Codex chat.
 *
 * State ownership stays with the calling task adapter: this core deliberately
 * does not know whether a token belongs to a migration ledger, a generic task
 * record, or another durable workflow. That keeps the delivery protocol
 * reusable without changing an adapter's completion or blocker policy.
 */
export function queueCodexContinuation({ threadId, message, execute = spawnSync, codex = 'codex' }) {
  const result = execute(codex, ['queue', '--thread', threadId, '--resume', '--message', message], { encoding: 'utf8' });
  const detail = commandDetail(result);
  if (result.error) throw Error(`Could not queue Codex continuation: ${result.error.message}`);
  if (result.status !== 0) throw Error(`Could not queue Codex continuation: ${detail || `codex exited ${result.status}`}`);
  if (/could not resume thread/i.test(detail) && !/already has an active writer/i.test(detail)) {
    throw Error(`Could not queue Codex continuation: ${detail}`);
  }
  return { queued: true, threadId, resumed: !/already has an active writer/i.test(detail) };
}

/**
 * Produces a bounded wake-up payload. The receiving worker must claim the
 * reserved token before acting, so duplicate or stale host deliveries are safe.
 */
export function continuationWakeMessage({ taskName, token, claimInstruction, workInstruction }) {
  return `${taskName} continuation is ready with token ${token}. This is a wake-up signal, not the current task state. ${claimInstruction} If it is stale, blocked, or completed, stop without performing work. If claimed, ${workInstruction}`;
}
