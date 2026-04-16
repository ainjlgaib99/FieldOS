---
name: fieldos:add-field
description: Add a new Airtable field to an existing FieldOS screen — updates the list query, rendered template, and submit form
context: fork
allowed-tools: Read Edit Bash(npm test)
user-invocable: true
---

# Add a New Airtable Field to FieldOS

Arguments: **$ARGUMENTS**

Parse the arguments as `TABLE_NAME FIELD_NAME` — for example `logs Weather` or `constraints Notes`.

## Step 1 — Read `index.html`

Read `index.html` and find:
1. The `load*()` function for the target table (e.g. `loadLogs()` for `logs`)
2. The `submit*()` function if one exists
3. The `AT.list()` call's `fields:[]` array for that table

## Step 2 — Add the field to the `AT.list()` query

In the relevant `load*()` function, add the new field name to the `fields:[]` array:
```js
// before
fields:['Title','Date','Status']
// after
fields:['Title','Date','Status','NEW_FIELD']
```

## Step 3 — Render the field in the list template

In the HTML template inside `load*()`, add the new field in an appropriate position:
```js
// example for a simple text field:
<div style="font-size:13px;color:var(--t2)">${r.fields['NEW_FIELD']||''}</div>
// for a date field:
<div style="font-size:12px;color:var(--t3)">${fmtDate(r.fields['NEW_FIELD'])}</div>
// for a status/badge field:
${badge(r.fields['NEW_FIELD']||'Open')}
```

## Step 4 — Update the submit form (if applicable)

If the table has a `submit*()` function:
1. Add a `<input>` or `<select>` element with an appropriate `id` in the relevant bottom sheet HTML
2. Map it in the `fields` object inside `submit*()`:
   ```js
   'NEW_FIELD': document.getElementById('input-id').value,
   ```
3. If it's optional, use the conditional pattern: `const val=document.getElementById('input-id').value; if(val) fields['NEW_FIELD']=val;`

## Step 5 — Check badge/pdot maps

If the new field is a **status or severity field**:
- Check `badge()` in `utils.js` — if any new status values aren't in the map, add them
- Check `pdot()` in `utils.js` — if it's a priority field, ensure new values are mapped
- Run `npm test` to ensure the badge/pdot tests still pass

## Step 6 — Run tests

```bash
npm test
```

Confirm all tests still pass. Report any failures.

---

**Reminder:** If this field doesn't exist yet in your Airtable base, add it there too before testing the live app.
