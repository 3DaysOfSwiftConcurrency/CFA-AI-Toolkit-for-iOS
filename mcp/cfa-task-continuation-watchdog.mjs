#!/usr/bin/env node
import { main } from './cfa-task-continuation-runner.mjs';
import { continuationWakeMessage, queueCodexContinuation } from './cfa-continuation-core.mjs';
import { pathToFileURL } from 'node:url';

export function recover(file, { queue = queueCodexContinuation } = {}) {
  let recovered;
  main(['recover', file], { out: value => { recovered = JSON.parse(value); } });
  if (!recovered.queued) return recovered;
  const task = recovered.task;
  const message = continuationWakeMessage({
    taskName: 'A coding task', token: recovered.token,
    claimInstruction: `First claim it through cfa-task-continuation-runner.mjs claim ${file} --token ${recovered.token}.`,
    workInstruction: `perform this exact next safe action: ${task.nextAction} Record evidence, and heartbeat before long work. Do not emit a final response while the task remains active.`
  });
  const delivery = queue({ threadId: task.continuation.threadId, message });
  main(['mark-delivery', file, '--token', recovered.token], { out: () => {} });
  return delivery;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: cfa-task-continuation-watchdog.mjs <state.json>'); process.exitCode = 1; }
  else { try { console.log(JSON.stringify(recover(file))); } catch (error) { console.error(error.message); process.exitCode = 1; } }
}
