import { randomUUID } from 'node:crypto';

export const terminalTaskStates = new Set(['blocked', 'completed', 'paused', 'replaced']);
export const activeTaskStates = new Set(['active', 'verifying']);

export function createTaskState({ objective, acceptanceCriteria, nextAction, threadId }) {
  if (![objective, acceptanceCriteria, nextAction, threadId].every(value => typeof value === 'string' && value.trim())) {
    throw Error('A task continuation needs an objective, acceptance criteria, next action and Codex thread.');
  }
  return {
    schemaVersion: 1, objective, acceptanceCriteria, nextAction, state: 'active',
    evidence: [], blocker: null,
    continuation: { host: 'codex', threadId, pending: null, active: null }
  };
}

export function validateTaskState(task) {
  const errors = [];
  if (task?.schemaVersion !== 1) errors.push('unsupported task continuation schema');
  for (const key of ['objective', 'acceptanceCriteria', 'nextAction', 'state']) {
    if (typeof task?.[key] !== 'string' || !task[key].trim()) errors.push(`${key} is required`);
  }
  if (![...terminalTaskStates, ...activeTaskStates].includes(task?.state)) errors.push('unknown task state');
  if (!task?.continuation?.threadId) errors.push('Codex thread is required');
  if (!Array.isArray(task?.evidence)) errors.push('evidence must be an array');
  if (task?.state === 'blocked' && (!task.blocker?.reason || !task.blocker?.unblockCondition)) errors.push('blocked tasks require a reason and unblock condition');
  if (task?.state === 'completed' && task.nextAction !== 'No further task work is required.') errors.push('completed tasks must not retain a next action');
  return errors;
}

export function reserveContinuation(task) {
  if (terminalTaskStates.has(task.state)) return { queued: false, reason: `Task is ${task.state}.` };
  if (task.continuation.active) return { queued: false, reason: 'A worker lease is active.' };
  if (!task.continuation.pending) task.continuation.pending = { token: randomUUID(), deliveryAttempts: 0 };
  return { queued: true, token: task.continuation.pending.token, task };
}

export function claimContinuation(task, token, { now = Date.now(), leaseSeconds = 1800 } = {}) {
  if (terminalTaskStates.has(task.state)) return { claimed: false, reason: `Task is ${task.state}.` };
  if (task.continuation.pending?.token !== token) return { claimed: false, reason: 'Continuation is stale or already claimed.' };
  const timestamp = new Date(now).toISOString();
  task.continuation.pending = null;
  task.continuation.active = { token, claimedAt: timestamp, heartbeatAt: timestamp, expiresAt: new Date(now + leaseSeconds * 1000).toISOString() };
  return { claimed: true, workerToken: token, task };
}

export function heartbeatContinuation(task, token, { now = Date.now(), leaseSeconds = 1800 } = {}) {
  if (task.continuation.active?.token !== token) throw Error('Only the active worker may renew this lease.');
  task.continuation.active.heartbeatAt = new Date(now).toISOString();
  task.continuation.active.expiresAt = new Date(now + leaseSeconds * 1000).toISOString();
  return task.continuation.active;
}

export function recoverContinuation(task, { now = Date.now() } = {}) {
  if (terminalTaskStates.has(task.state)) return { queued: false, reason: `Task is ${task.state}.` };
  if (task.continuation.active && Date.parse(task.continuation.active.expiresAt) > now) return { queued: false, reason: 'A worker lease is active.' };
  task.continuation.active = null;
  return reserveContinuation(task);
}
