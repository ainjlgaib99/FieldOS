---
name: fieldos:add-screen
description: Scaffold a complete new screen in FieldOS — HTML section, load function, router wiring, and title entry
context: fork
allowed-tools: Read Edit Bash(npm test)
user-invocable: true
---

# Add a New FieldOS Screen

Screen name: **$ARGUMENTS**

## Step 1 — Read the existing structure

Read `index.html` to understand the current screen layout (look for existing `<div id="scr-*" class="scr">` sections and how `loadScreen()` and `show()` are structured).

## Step 2 — Add the HTML section

In `index.html`, find the last `<div class="scr">` block and insert a new section after it following this pattern:

```html
<!-- ── SCREEN_NAME SCREEN ── -->
<div id="scr-SCREEN_NAME" class="scr">
  <div id="SCREEN_NAME-list"></div>
</div>
```

Replace `SCREEN_NAME` with `$ARGUMENTS` (lowercase, dash-separated if multi-word).

## Step 3 — Add the load function

After the last `load*()` function in the `<script>` block, add:

```js
// ── SCREEN_NAME ──
async function loadSCREEN_NAME(){
  const el=document.getElementById('SCREEN_NAME-list');
  el.innerHTML=spin();
  try {
    // TODO: replace with the correct AT.list() call
    const records=await AT.list(T.TABLE_NAME,{sort:[{field:'SORT_FIELD',direction:'desc'}],maxRecords:50});
    if(!records.length){el.innerHTML=empty('📋','No SCREEN_NAME records','');return;}
    el.innerHTML=records.map(r=>`
      <div class="li">
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:500">${r.fields['DISPLAY_FIELD']||'—'}</div>
        </div>
      </div>`).join('');
  } catch(e){ el.innerHTML=empty('❌','Error',e.message); }
}
```

Use camelCase for the function name: `load` + PascalCase version of `$ARGUMENTS`.

## Step 4 — Wire into the router

In `loadScreen(s)`, add:
```js
case '$ARGUMENTS': loadSCREEN_NAME(); break;
```

## Step 5 — Add a title entry

In `show(screen)`, add to the `titles` object:
```js
'$ARGUMENTS': ['$ARGUMENTS Title', '$ARGUMENTS Subtitle'],
```

Choose a sensible title and subtitle based on the screen name.

## Step 6 — Run tests

```bash
npm test
```

Confirm all tests still pass. Report any failures.
