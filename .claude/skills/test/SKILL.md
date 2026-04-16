---
name: fieldos:test
description: Run the FieldOS Vitest test suite and report any failures with context
allowed-tools: Bash(npm test) Bash(git diff *)
user-invocable: true
---

# Run FieldOS Tests

Show which files changed since the last commit (to help correlate failures):
```!
git diff --name-only HEAD 2>/dev/null | head -20
```

Run the full test suite:

```bash
npm test
```

After running:
- Report how many tests passed and failed
- If any failed, quote the exact failure message and identify which function in `utils.js` or `index.html` is affected
- If the failure is in `tests/api.test.js`, note that the AT caching/pagination logic is the likely culprit
- Suggest a focused fix if the root cause is clear from the output
