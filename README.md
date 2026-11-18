# From Cold to Quote

An independent interview-portfolio concept: a small B2B lead-generation prototype exploring how industrial prospects might move from target account to quote request for low-emission packing. It is not an official JD Jones website or a claim that the listed companies are qualified prospects.

## Open the prototype

Open `index.html` directly in a modern browser (for example, double-click it in File Explorer). The pages use only relative local HTML, CSS, and JavaScript files. There is no server, build step, package installation, database, or network request required.

## Folder structure

```text
/
+-- index.html             Dashboard
|-- accounts.html          Searchable target-account list
|-- outreach.html          Editable outreach drafts
|-- tracker.html            Local lead-pipeline board
|-- css/
|   `-- style.css           Shared responsive styles and color system
|-- js/
|   |-- app.js              Shared navigation, reset, and localStorage helpers
|   |-- accounts.js         Account table, filters, and details panel
|   |-- dashboard.js        Dashboard counts, rates, chart, and KPI assumptions
|   |-- outreach.js         Outreach tabs, editing, copy, and persistence
|   `-- tracker.js          Pipeline board rendering and stage updates
`-- data/
    |-- accounts.js         Sample account records (window.APP_DATA.accounts)
    `-- outreach.js         Editable draft content (window.APP_DATA.outreach)
```

## Data and localStorage

The sample content is stored in local JavaScript files under `data/` and exposed through `window.APP_DATA`. The pages load those scripts directly; they do not fetch JSON.

Edits are stored in the browser's `localStorage` under the key `jd-jones-lead-prototype`. The stored object contains account stages and notes, outreach edits, dashboard assumption targets, and follow-up reminder timing. An account marked "Contacted" is due for a reminder after two days if it has not advanced to another stage. The reminder appears after 48 hours while a prototype page remains open, or the next time a page opens if the browser was closed. Choosing "Remind me tomorrow" postpones the prompt for 24 hours. Data remains in that browser profile on that device; it is not shared or backed up. Clearing browser data will also remove it.

## Reset saved data

Use the **Reset data** button in the navigation and confirm. This removes locally saved stages, notes, outreach edits, KPI targets, and reminder timing. The original sample data remains unchanged in the `data/` files.

## Scaling from 10 to 50 accounts

1. Add records to `data/accounts.js`, keeping each `id` unique and using the existing segment, priority, and stage values.
2. Keep the existing account fields complete and mark any unverified fit assumptions for research before outreach.
3. Test search, segment and priority filters, stage changes, notes, dashboard counts, and conversion calculations with the expanded list.
4. Review the dashboard interpretation and KPI assumptions against the larger sample; the current rates are prototype calculations, not forecasts or performance claims.
5. Keep localStorage for a lightweight single-user demo. For shared team access, synchronization, permissions, backups, or substantially larger datasets, plan a backend and a migration/import workflow rather than treating browser storage as a database.

## Placeholder text to verify before presenting

No current project content contains the exact `[to be verified]` placeholder. Other editable or incomplete copy remains intentionally marked, including `[EDITABLE DRAFT]`, `[Company]`, `[Your name / role]`, and the footer's `[My Name]`. Replace or personalize these before presenting or sending any draft. Account notes also say "Verify before use"; the sample companies and fit hypotheses should be researched independently.
