---
name: coding-task-orchestrator
description: Pursue an authorized coding task through its explicit completion criteria, recover ordinary runner interruptions, and inspect completed evidence before reporting results. Use for implementation, repair, migration, or audit work with relevant checks; not for a one-off explanation or code review with no requested changes.
---

# Coding Task Orchestrator

Treat the stated outcome and acceptance criteria as the active task. Continue
until they are satisfied, the user pauses or replaces the task, or a genuine
decision, permission boundary, or non-recoverable external condition prevents
the next safe action.

Read the [project workflow and design authority](references/project-workflow.md)
and [Swift coding guide](references/swift-coding-guide.md) before continuing.
Apply the [mandatory final compilation gate](references/project-workflow.md#mandatory-final-compilation-gate)
when the task changes an app. When a completion decision needs explanation, use
the [decision rationale and verified learning links](references/explanations/guide.md).

This skill coordinates work. An applicable project, architecture, migration,
testing, or security skill still supplies the domain rules.

## Autonomous continuation

For an authorized task that must continue without waiting for a developer to
send another message, use the toolkit's generic task-continuation runner when
its MCP or command-line interface is available. It persists the objective,
acceptance criteria, exact next action and Codex thread; a watchdog then
requeues a stopped worker only while the task remains active. Claim the
continuation token before acting, heartbeat before long operations, and record
the next action at every non-terminal checkpoint. Do not use it for an
ordinary one-off explanation or when the developer has asked to pause.

## Maintain forward progress

- Record the requested outcome, acceptance checks, current evidence, remaining
  work, and immediate next safe action. Update that compact ledger after a
  material finding or change so the task can resume after interruption.
- Treat an identified, safe next action as an instruction to perform that
  action now. Do not turn a progress report, partial-result summary, or list
  of remaining files into a final response while that next action is known and
  within the authorized scope.
- Do not become idle because a command started, a runner was temporarily
  unavailable, or an intermediate check failed. Interpret the result, take the
  next safe action, and continue toward the active criteria.
- A task is not complete because a change compiles, a command launches, or one
  subset passes. Verify the checks appropriate to the changed risk.
- Before sending a final response, make an explicit terminal-state decision:
  completed, user-paused/replaced, genuinely blocked, or still active. Only
  the first three permit ending the turn. "Partial", "remaining work", a
  recoverable test interruption, or a known next subtask means the task is
  still active; continue with the recorded next safe action instead.
- Use a platform goal facility only when the user explicitly asks to create a
  goal. Otherwise, the task ledger is the source of continuity.

## Treat test evidence honestly

- A test has a result only after its process ends and its authoritative result
  has been inspected. Never infer success from launch output or an incomplete
  result bundle.
- Classify a failed or unavailable run before acting: test failure, code/build
  failure, cancellation/hang, incomplete record, or runner/environment failure.
- A reproducible failure is work to diagnose and fix, not a reason to retry
  blindly or ask the user to say “continue.” Run the smallest relevant check
  after each repair, then broaden verification for the requested scope.
- Never change product behaviour, normal app launch/root interface, test
  criteria, reference evidence, or a test host merely to make a test pass.

## Recover safely and with bounds

Recover clear, non-destructive interruptions autonomously: wait for an active
process, make a new result record, restart a stopped simulator, or rerun a test
that did not reach a final result. Preserve previous evidence.

After one recovery attempt for the same runner condition, inspect the new
evidence. If it repeats, diagnose the condition rather than repeating it.
Never erase simulators, caches, build products, user data, or credentials
without explicit approval.

Ask the user only for a meaningful choice, new authority, missing information
or credentials, or an external condition that remains after bounded recovery.

## CFA project instructions

For an authorized CFA implementation task, run
`bash scripts/install-cfa-orchestration-rule.sh <project-root>` before the first
product edit. It preserves project-specific instructions and updates only its
marked section. Do not alter instructions for a read-only review, an unrelated
project, or a project that is not writable.

For Xcode and Simulator work, read [the iOS testing reference](references/ios-testing.md).
Use [the test helper](scripts/run-ios-tests.sh) when its inputs fit the project,
or follow the same completed-evidence and bounded-recovery contract.

## Finish

Report completion only when the requested deliverables exist and the agreed
checks have completed with inspectable results. State concise evidence and any
genuinely unverified remainder.

Never use a final response merely to announce partial progress or hand the
same active task back to the developer. If completion is not yet justified,
continue working. If external authority or a decision is genuinely required,
ask one concise question that identifies that blocker; otherwise take the next
safe action yourself.
