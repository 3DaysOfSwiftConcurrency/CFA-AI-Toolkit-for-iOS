#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: run-ios-tests.sh --project <project.xcodeproj> --scheme <scheme> \
  --destination <xcode-destination> --simulator-id <UDID> \
  --result-bundle <path.xcresult> [--only-testing <target/test>] [--preflight <command>]

Runs one Xcode test invocation, waits for its final result, and prints the
authoritative xcresult summary. An incomplete result triggers one safe simulator
restart and a retry with a distinct result bundle. It never erases data.
EOF
}

project=''; scheme=''; destination=''; simulator_id=''; result_bundle=''; only_testing=''; preflight=''
while (($#)); do
  case "$1" in
    --project) project="$2"; shift 2 ;;
    --scheme) scheme="$2"; shift 2 ;;
    --destination) destination="$2"; shift 2 ;;
    --simulator-id) simulator_id="$2"; shift 2 ;;
    --result-bundle) result_bundle="$2"; shift 2 ;;
    --only-testing) only_testing="$2"; shift 2 ;;
    --preflight) preflight="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; usage >&2; exit 64 ;;
  esac
done
for value in project scheme destination simulator_id result_bundle; do
  if [[ -z "${!value}" ]]; then
    printf 'Missing required --%s.\n' "${value//_/-}" >&2
    exit 64
  fi
done
if [[ -e "$result_bundle" ]]; then
  printf 'Result bundle already exists: %s\n' "$result_bundle" >&2
  exit 64
fi

boot_simulator() {
  xcrun simctl boot "$simulator_id" 2>/dev/null || true
  xcrun simctl bootstatus "$simulator_id" -b
}

run_once() {
  local bundle="$1" log="$1.xcodebuild.log"
  local -a command=(xcodebuild test -project "$project" -scheme "$scheme" -destination "$destination" -resultBundlePath "$bundle")
  [[ -n "$only_testing" ]] && command+=("-only-testing:$only_testing")
  set +e
  "${command[@]}" 2>&1 | tee "$log"
  local exit_code=${PIPESTATUS[0]}
  set -e
  if [[ -f "$bundle/Info.plist" ]]; then
    xcrun xcresulttool get test-results summary --path "$bundle"
    return "$exit_code"
  fi
  if grep -Eq '\*\* (TEST )?BUILD FAILED \*\*' "$log"; then
    printf 'Xcode reported a build failure without a result bundle; no restart was performed.\n' >&2
    return "${exit_code:-65}"
  fi
  printf 'No finalized result bundle was produced: %s\n' "$bundle" >&2
  return 75
}

[[ -n "$preflight" ]] && bash -lc "$preflight"
boot_simulator
if run_once "$result_bundle"; then
  exit 0
else
  first_exit=$?
fi
if (( first_exit != 75 )); then
  printf 'Xcode produced a completed failure. Inspect it; no blind retry was performed.\n' >&2
  exit "$first_exit"
fi
printf 'Recovering incomplete runner state with one safe simulator restart.\n' >&2
xcrun simctl shutdown "$simulator_id" || true
boot_simulator
retry_bundle="${result_bundle%.xcresult}.retry-2.xcresult"
run_once "$retry_bundle"
