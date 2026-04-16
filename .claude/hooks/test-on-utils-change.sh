#!/bin/sh
# PostToolUse hook: auto-run tests whenever utils.js is modified.
# Receives a JSON object on stdin with tool_name, tool_input, tool_response.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  process.stdout.write(d.tool_input && d.tool_input.file_path || '');
" 2>/dev/null)

# Only trigger on changes to utils.js
case "$FILE_PATH" in
  *utils.js)
    echo '{"message":"utils.js changed — running tests to catch regressions…"}' >&2
    cd "$(dirname "$0")/../../.." && npm test
    ;;
esac

exit 0
