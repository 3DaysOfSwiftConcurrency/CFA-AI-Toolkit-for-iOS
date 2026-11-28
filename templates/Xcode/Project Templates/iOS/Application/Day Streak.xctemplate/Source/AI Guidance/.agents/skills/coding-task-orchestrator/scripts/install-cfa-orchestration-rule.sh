#!/usr/bin/env bash
set -euo pipefail

if (( $# != 1 )); then
  printf 'Usage: %s <CFA project root>\n' "$(basename "$0")" >&2
  exit 64
fi

project_root="$1"
if [[ ! -d "$project_root" ]]; then
  printf 'Project root does not exist: %s\n' "$project_root" >&2
  exit 66
fi

agents_file="$project_root/AGENTS.md"
start_marker='<!-- CFA-CODING-TASK-ORCHESTRATOR:START -->'
end_marker='<!-- CFA-CODING-TASK-ORCHESTRATOR:END -->'

rule() {
  printf '%s\n' \
    "$start_marker" \
    '## CFA task orchestration' \
    '- For code-changing CFA work with build, test, audit, or delivery acceptance criteria, use `coding-task-orchestrator`.' \
    '- Maintain the requested scope until applicable checks complete and their authoritative results are inspected. Do not require the developer to prompt “continue” after an interrupted, incomplete, or failing run.' \
    '- Recover routine non-destructive runner interruptions autonomously. A reproducible failure becomes the next diagnostic or repair action; ask only for a meaningful decision, new authority, or a blocker that remains after bounded safe recovery.' \
    '- Never change the product, normal application launch/root interface, test criteria, or test host merely to make a runner or test pass.' \
    "$end_marker"
}

desired_rule="$(rule)"
if [[ -f "$agents_file" ]] && grep -Fqx "$start_marker" "$agents_file"; then
  existing_rule="$(sed -n "/$start_marker/,/$end_marker/p" "$agents_file")"
  if [[ "$existing_rule" == "$desired_rule" ]]; then
    printf 'CFA task orchestration rule is already current: %s\n' "$agents_file"
    exit 0
  fi
fi

temporary_file="$(mktemp "$project_root/.AGENTS.md.cfa-orchestration.XXXXXX")"
trap 'rm -f "$temporary_file"' EXIT
if [[ -f "$agents_file" ]]; then
  if grep -Fqx "$start_marker" "$agents_file"; then
    sed "/$start_marker/,/$end_marker/d" "$agents_file" > "$temporary_file"
  else
    cp "$agents_file" "$temporary_file"
  fi
fi
if [[ -s "$temporary_file" ]]; then
  printf '\n' >> "$temporary_file"
fi
rule >> "$temporary_file"
mv "$temporary_file" "$agents_file"
trap - EXIT
printf 'Installed CFA task orchestration rule: %s\n' "$agents_file"
