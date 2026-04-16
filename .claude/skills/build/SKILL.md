---
name: fieldos:build
description: Build FieldOS for production, inject the Airtable token, and verify the output bundle
allowed-tools: Bash(node build.js) Bash(grep *) Bash(wc *)
user-invocable: true
---

# Build FieldOS for Production

Run the build script:

```bash
node build.js
```

Then verify the output bundle is correct:

```bash
grep -c 'YOUR_AIRTABLE_TOKEN' public/index.html
```
This must return `0` — if it returns `1`, the `AIRTABLE_TOKEN` environment variable is not set and the sentinel was not replaced.

```bash
grep -c 'function toQS' public/index.html
```
This must return `1` — confirms `utils.js` was inlined successfully.

```bash
wc -l public/index.html
```
Report the line count so we know the bundle is not unexpectedly empty.

Report the overall result:
- **Success**: all three checks pass
- **Failure**: quote which check failed and explain what to fix (e.g., set `AIRTABLE_TOKEN` in your environment before building)
