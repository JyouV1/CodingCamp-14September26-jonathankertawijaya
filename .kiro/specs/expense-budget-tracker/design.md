# Design Document: Expense & Budget Tracker

## Overview

The Expense & Budget Tracker is a fully client-side web application delivered as three static files:
- `index.html` — markup shell and CDN script references
- `css/style.css` — all visual styling including responsive layout and theme variables
- `js/script.js` — all application logic, state management, and DOM interaction

There is no build step, no server, and no framework. The app runs directly via the `file://` protocol and persists all data through the browser's `localStorage` API.

Chart.js is loaded from a CDN (`<script>` tag in `index.html`) and is the only external dependency.

The design emphasises a clean **module pattern** inside `script.js` — code is split into clearly named, single-responsibility sections (Storage, State, Validation, Formatter, Chart, Renderer, EventHandlers, App) without bundlers or ES modules, relying instead on an immediately-invoked function expression (IIFE) or a top-level `App.init()` call to avoid global namespace pollution.

---

## Architecture

### File Delivery Model

```
expense-budget-tracker/
├── index.html          ← app shell, CDN link for Chart.js, links to style.css and script.js
├── css/
│   └── style.css       ← design tokens (CSS custom properties), layout, component styles, themes
└── js/
    └── script.js       ← all application logic (module-pattern IIFE)
```

The three files are opened directly in a browser (`file://`). Chart.js is fetched from the CDN on first load; if the user is offline, the chart degrades gracefully with an error message.

### Logical Layers in `script.js`

```
┌─────────────────────────────────────────────────┐
│                    UI Layer                      │
│  Renderer  ←→  EventHandlers  ←→  DOMHelpers    │
├─────────────────────────────────────────────────┤
│                 Application Layer                │
│      App (orchestrator / init / reactivity)     │
├─────────────────────────────────────────────────┤
│                  Domain Layer                    │
│  Validation  │  Formatter  │  ChartManager       │
├─────────────────────────────────────────────────┤
│                Infrastructure Layer              │
│           Storage  │  State                     │
└─────────────────────────────────────────────────┘
```

Data flows in one direction:
1. User events → EventHandlers → mutate State → persist via Storage
2. After every mutation → `App.render()` orchestrates all Renderer calls and ChartManager update

### Module Responsibilities

| Module | Responsibility |
|---|---|
| `Storage` | Read/write localStorage; handle unavailability gracefully |
| `State` | In-memory application state (transactions, categories, limits, theme) |
| `Validation` | Pure functions — validate form inputs and category/limit entries |
| `Formatter` | Pure functions — format currency, dates, percentages |
| `ChartManager` | Own the Chart.js instance; compute chart data; update/destroy |
| `Renderer` | Build and update all DOM regions (form, list, balance, summary, alerts) |
| `EventHandlers` | Attach all DOM event listeners; delegate user intent to App |
| `App` | Initialise, orchestrate render cycles, expose public API |

---

## Components and Interfaces

### `Storage` module

```js
Storage.save(key, value)         // JSON.stringify and write to localStorage
Storage.load(key, fallback)      // JSON.parse; return fallback on error
Storage.isAvailable()            // returns boolean; checks localStorage is accessible
```

Keys used:
- `"ebt_transactions"` — array of Transaction objects
- `"ebt_categories"` — array of custom category name strings
- `"ebt_limits"` — object mapping category name → spending limit number
- `"ebt_theme"` — `"light"` | `"dark"`

### `State` module

```js
State.transactions   // Transaction[]
State.categories     // string[]   (defaults + custom)
State.limits         // { [category: string]: number }
State.theme          // "light" | "dark"

State.init(stored)              // hydrate from stored data
State.addTransaction(tx)        // prepend to transactions array
State.deleteTransaction(id)     // remove by id
State.addCategory(name)         // append to categories array
State.setLimit(category, value) // update limits map
State.setTheme(t)               // update theme value
```

### `Validation` module (pure functions)

```js
Validation.validateTransaction({ name, amount, category })
// returns { valid: boolean, errors: { name?, amount?, category? } }

Validation.validateCategoryName(name, existingCategories)
// returns { valid: boolean, error?: string }

Validation.validateSpendingLimit(value)
// returns { valid: boolean, error?: string }
```

### `Formatter` module (pure functions)

```js
Formatter.currency(amount)        // e.g. "$1,234.56" or "-$1,234.56"
Formatter.date(isoString)         // e.g. "2024-07-15" (YYYY-MM-DD from UTC timestamp)
Formatter.percentage(value, dp)   // e.g. "34.5%" (rounded to dp decimal places)
Formatter.monthLabel(isoString)   // e.g. "July 2024"
Formatter.monthKey(isoString)     // e.g. "2024-07"   (for grouping)
```

### `ChartManager` module

```js
ChartManager.init(canvasId)               // create Chart.js instance
ChartManager.update(transactions, categories, limits)  // recompute data and call chart.update()
ChartManager.showEmpty()                  // switch to placeholder state
ChartManager.destroy()                    // clean up Chart.js instance
```

Internally computes:
- Per-category spending totals (excluding ≤ 0 amounts)
- Labels, data array, backgroundColor array
- Percentage strings for the legend (rounded to 1 dp)

### `Renderer` module

```js
Renderer.renderBalance(transactions)
Renderer.renderTransactionList(transactions, categories, limits)
Renderer.renderChart(transactions, categories, limits)
Renderer.renderMonthlySummary(transactions)
Renderer.renderCategorySelector(categories)       // updates <select> in form
Renderer.renderSpendingLimitControls(categories, limits)
Renderer.applyTheme(theme)
Renderer.showFormErrors(errors)
Renderer.clearFormErrors()
Renderer.showCategoryError(message)
Renderer.showLimitError(category, message)
Renderer.showStorageWarning(message)
Renderer.clearStorageWarning()
```

### `EventHandlers` module

```js
EventHandlers.onTransactionSubmit(event)
EventHandlers.onDeleteTransaction(event)     // event delegation on list container
EventHandlers.onAddCategory(event)
EventHandlers.onSetLimit(category, event)
EventHandlers.onThemeToggle()
EventHandlers.onShowSummary()
EventHandlers.onHideSummary()
```

### `App` module

```js
App.init()     // called on DOMContentLoaded
App.render()   // full re-render of all reactive regions
```

`App.init()` sequence:
1. Check localStorage availability; if unavailable, set `State` to defaults and show warning.
2. Hydrate `State` from localStorage.
3. Apply restored theme immediately (before any rendering).
4. Attach all event listeners via `EventHandlers`.
5. Call `ChartManager.init("spending-chart")`.
6. Call `App.render()`.

`App.render()` sequence (called after every mutation):
1. `Renderer.renderBalance(State.transactions)`
2. `Renderer.renderTransactionList(State.transactions, State.categories, State.limits)`
3. `Renderer.renderChart(State.transactions, State.categories, State.limits)`
4. `Renderer.renderCategorySelector(State.categories)`
5. `Renderer.renderSpendingLimitControls(State.categories, State.limits)`

Monthly Summary is rendered on demand (not in the main render cycle) since it is a separate view.

---

## Data Models

### Transaction

```js
{
  id: string,           // crypto.randomUUID() or Date.now().toString() as fallback
  name: string,         // 1–100 characters
  amount: number,       // positive float, 0.01–999,999,999.99
  category: string,     // must be a member of State.categories
  timestamp: string     // ISO 8601 UTC string, e.g. "2024-07-15T09:30:00.000Z"
}
```

### Custom Category

Stored as a plain `string[]` in localStorage under `"ebt_categories"`. The in-memory `State.categories` array always contains the three defaults first:

```js
["Food", "Transport", "Fun", ...customCategories]
```

### Spending Limits

```js
{
  [categoryName: string]: number   // positive float, 0.01–999,999,999.99
}
```

Stored as a JSON object in localStorage under `"ebt_limits"`. Categories with no limit set simply have no key in this object.

### Theme Preference

A single string `"light"` or `"dark"` stored under `"ebt_theme"`. Defaults to `"light"` if missing or unreadable.

### Derived: Monthly Summary Entry (computed, not stored)

```js
{
  monthKey: string,             // "YYYY-MM"
  monthLabel: string,           // "July 2024"
  total: number,                // sum of all transaction amounts in this month
  byCategory: {
    [category: string]: number  // sum per category
  }
}
```

Computed by `buildMonthlySummary(transactions)` — a pure function used by `Renderer.renderMonthlySummary`.

### Derived: Chart Data (computed, not stored)

```js
{
  labels: string[],             // category names
  data: number[],               // spending totals per category (excluding ≤ 0)
  backgroundColors: string[],   // deterministic color per category index
  percentages: string[]         // "34.5%", rounded to 1 dp
}
```

Computed by `buildChartData(transactions, categories)` — a pure function used by `ChartManager.update`.

---

## HTML Structure (`index.html`)

```html
<body data-theme="light">

  <!-- Header -->
  <header>
    <h1>Expense Tracker</h1>
    <button id="theme-toggle" aria-label="Toggle dark mode">🌙</button>
  </header>

  <!-- Storage warning banner (hidden by default) -->
  <div id="storage-warning" role="alert" hidden></div>

  <!-- Balance -->
  <section id="balance-section">
    <p>Total Balance</p>
    <p id="balance-display">$0.00</p>
  </section>

  <!-- Transaction Form -->
  <section id="form-section">
    <form id="transaction-form" novalidate>
      <div class="field-group">
        <label for="item-name">Item Name</label>
        <input id="item-name" type="text" maxlength="100" autocomplete="off" required />
        <span class="field-error" id="error-name" role="alert"></span>
      </div>
      <div class="field-group">
        <label for="amount">Amount</label>
        <input id="amount" type="number" min="0.01" max="999999999.99" step="0.01" required />
        <span class="field-error" id="error-amount" role="alert"></span>
      </div>
      <div class="field-group">
        <label for="category">Category</label>
        <select id="category" required></select>
        <span class="field-error" id="error-category" role="alert"></span>
      </div>
      <button type="submit">Add Transaction</button>
    </form>
  </section>

  <!-- Custom Category -->
  <section id="custom-category-section">
    <h2>Add Custom Category</h2>
    <div class="field-group">
      <input id="new-category" type="text" maxlength="50" placeholder="Category name" />
      <button id="add-category-btn">Add</button>
      <span class="field-error" id="error-category-name" role="alert"></span>
    </div>
  </section>

  <!-- Spending Limits -->
  <section id="spending-limits-section">
    <h2>Spending Limits</h2>
    <div id="limits-list"></div>
  </section>

  <!-- Chart -->
  <section id="chart-section">
    <h2>Spending Distribution</h2>
    <div id="chart-container">
      <canvas id="spending-chart"></canvas>
      <p id="chart-empty" hidden>No spending data available.</p>
    </div>
  </section>

  <!-- Transaction List -->
  <section id="list-section">
    <h2>Transactions</h2>
    <div id="transaction-list" role="list">
      <p id="list-empty">No transactions recorded yet.</p>
    </div>
  </section>

  <!-- Monthly Summary -->
  <section id="summary-section">
    <h2>Monthly Summary</h2>
    <button id="show-summary-btn">Show Summary</button>
    <div id="summary-content" hidden></div>
  </section>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="js/script.js"></script>
</body>
```

---

## CSS Design Tokens and Theming (`style.css`)

All colors and spacing are CSS custom properties on `:root`. Theme switching applies a `data-theme="dark"` attribute to `<body>`, overriding the light values:

```css
:root {
  --color-bg: #f9f9f9;
  --color-surface: #ffffff;
  --color-text: #1a1a1a;
  --color-accent: #4f46e5;
  --color-danger: #dc2626;
  --color-warning: #d97706;
  --color-limit-alert: #fef3c7;
  --color-limit-alert-border: #f59e0b;
  --color-border: #e5e7eb;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --radius: 8px;
}

[data-theme="dark"] {
  --color-bg: #111827;
  --color-surface: #1f2937;
  --color-text: #f9fafb;
  --color-border: #374151;
  --color-limit-alert: #451a03;
  --color-limit-alert-border: #92400e;
}
```

The `Renderer.applyTheme(theme)` function sets `document.body.dataset.theme = theme`.

### Responsive Layout

A single CSS Grid layout adapts across breakpoints:

- **≤ 600 px** (mobile): single column, all sections stack vertically
- **601–1024 px** (tablet): two-column grid — form+list on left, chart+summary on right
- **≥ 1025 px** (desktop): same two-column with wider gutter and larger chart

The `#transaction-list` container has a fixed `max-height` (e.g. `480px`) with `overflow-y: auto` so internal scrolling does not affect outer layout.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transaction submission creates a new transaction

*For any* valid (name, amount, category) triple — where name is 1–100 non-whitespace characters, amount is a number in [0.01, 999,999,999.99], and category is a member of the current category list — submitting the form shall increase the transaction count by exactly 1 and the new transaction shall be the first item in the list.

**Validates: Requirements 1.2, 2.3**

---

### Property 2: Validator correctly classifies all inputs

*For any* (name, amount, category) triple, `Validation.validateTransaction` shall return `valid: true` if and only if name is non-empty and ≤ 100 characters, amount is a finite positive number in [0.01, 999,999,999.99], and category is a non-empty string; otherwise it shall return `valid: false` with at least one error field set.

**Validates: Requirements 1.3, 1.4, 1.6**

---

### Property 3: Invalid inputs are rejected without side effects

*For any* input triple that fails validation, submitting the form shall leave the transaction list length unchanged and shall not write a new entry to localStorage.

**Validates: Requirements 1.4, 1.6**

---

### Property 4: Form clears after successful submission

*For any* valid submission, after the transaction is created all form fields (item name, amount, category) shall be empty/reset to their default values.

**Validates: Requirements 1.5**

---

### Property 5: Transaction list renders all fields correctly

*For any* transaction object `{ name, amount, category, timestamp }`, the rendered DOM entry for that transaction shall contain the name text, an amount string matching `/^-?\$[\d,]+\.\d{2}$/`, the category label, and a date string matching `/^\d{4}-\d{2}-\d{2}$/`.

**Validates: Requirements 2.1**

---

### Property 6: New transactions are prepended to the list

*For any* existing transaction list and any new valid transaction, after adding the new transaction the first element of the rendered list shall correspond to the newly added transaction.

**Validates: Requirements 2.3**

---

### Property 7: Each rendered transaction row contains a delete control

*For any* non-empty transaction list, every rendered transaction entry in the DOM shall contain exactly one element with a `data-id` attribute matching the transaction's `id`.

**Validates: Requirements 2.4**

---

### Property 8: Delete removes the transaction and updates storage

*For any* transaction list containing at least one entry, deleting a transaction by its id shall result in a list that does not contain that id, both in `State.transactions` and in the value returned by `Storage.load("ebt_transactions")`.

**Validates: Requirements 2.5, 9.2**

---

### Property 9: Balance equals the negated sum of all transaction amounts

*For any* list of transactions, `computeBalance(transactions)` shall equal `-(sum of all transaction amounts)`, rounded to 2 decimal places.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 10: Balance is formatted as a currency string

*For any* numeric balance value, `Formatter.currency(value)` shall return a string matching `/^-?\$[\d,]+\.\d{2}$/`, where negative values have a leading `-` before the `$`.

**Validates: Requirements 3.4, 3.5, 3.6**

---

### Property 11: Chart data proportions match category spending shares

*For any* non-empty list of transactions containing only positive amounts, the `data` array produced by `buildChartData(transactions, categories)` shall satisfy: for every index `i`, `data[i] / sum(data) ≈ categorySpend[i] / totalSpend` (within floating-point tolerance).

**Validates: Requirements 4.1, 4.2, 4.3**

---

### Property 12: Legend percentages are correctly rounded and sum to ≈ 100%

*For any* chart data set with at most 20 categories, the sum of all legend percentage values (parsed from the rounded strings) shall be within 1.0% of 100, and each individual percentage shall equal `round(category_share * 100, 1)`.

**Validates: Requirements 4.5**

---

### Property 13: Zero and negative transaction amounts are excluded from chart data

*For any* transaction list containing a mix of positive and non-positive (≤ 0) amounts, `buildChartData` shall include only transactions with `amount > 0` in its totals, making the sum of `data` equal to the sum of only positive amounts.

**Validates: Requirements 4.6**

---

### Property 14: Valid custom categories are added to the selector

*For any* category name string of length 1–50 that does not match any existing category (case-insensitively), calling `State.addCategory(name)` and re-rendering shall result in `name` appearing as an `<option>` in the category `<select>` element.

**Validates: Requirements 5.2**

---

### Property 15: Custom categories round-trip through storage

*For any* set of valid custom category names, saving them and then calling `State.init(Storage.load(...))` shall result in `State.categories` containing all original custom category names in the same order.

**Validates: Requirements 5.3, 5.6, 9.3**

---

### Property 16: Invalid category names are rejected without side effects

*For any* category name that is empty, exceeds 50 characters, or matches an existing category name (case-insensitively), `Validation.validateCategoryName` shall return `valid: false` and `State.categories` shall remain unchanged.

**Validates: Requirements 5.4, 5.5**

---

### Property 17: Monthly summary totals equal the sum of transactions per month

*For any* transaction list, `buildMonthlySummary(transactions)` shall return entries where each entry's `total` equals the sum of all transaction amounts whose `timestamp` falls in that calendar month (rounded to 2 decimal places), and each entry's `byCategory[cat]` equals the sum of amounts for that category in that month.

**Validates: Requirements 6.1, 6.2**

---

### Property 18: Monthly summary entries are sorted in reverse chronological order

*For any* transaction list spanning multiple calendar months, the array returned by `buildMonthlySummary` shall be ordered such that `entries[i].monthKey >= entries[i+1].monthKey` for all consecutive pairs.

**Validates: Requirements 6.3**

---

### Property 19: Spending limit persistence round-trip

*For any* category name and valid limit value, after `State.setLimit(category, value)` and `Storage.save("ebt_limits", State.limits)`, calling `Storage.load("ebt_limits")` shall return an object where `result[category] === value`.

**Validates: Requirements 7.2**

---

### Property 20: Spending limit validation rejects out-of-range values

*For any* value that is not a finite positive number in [0.01, 999,999,999.99], `Validation.validateSpendingLimit(value)` shall return `valid: false`.

**Validates: Requirements 7.3**

---

### Property 21: Highlight status equals (category spending >= limit)

*For any* category, its `highlighted` state computed by `computeHighlights(transactions, limits)` shall be `true` if and only if a limit exists for that category and the sum of transaction amounts for that category is ≥ the limit; otherwise it shall be `false`.

**Validates: Requirements 7.4, 7.5, 7.6, 7.7**

---

### Property 22: Theme toggle is a round-trip

*For any* initial theme state `t ∈ {"light", "dark"}`, toggling twice shall return to `t`, and toggling once shall produce the other theme value.

**Validates: Requirements 8.2**

---

### Property 23: Theme preference persists and restores correctly

*For any* theme value `t ∈ {"light", "dark"}`, after `Storage.save("ebt_theme", t)` and `State.init(Storage.load(...))`, `State.theme` shall equal `t`.

**Validates: Requirements 8.3, 8.4**

---

### Property 24: Storage writes precede UI render

*For any* transaction mutation (add or delete), the value returned by `Storage.load("ebt_transactions")` after the operation shall reflect the mutated state (not the pre-mutation state), confirming persistence happened before or in the same synchronous block as the render.

**Validates: Requirements 9.1, 9.2**

---

### Property 25: Full state round-trip through storage

*For any* complete application state `{ transactions, categories, limits, theme }`, serialising to localStorage and then calling `App.init()` against that storage shall produce a `State` object equal to the original (same transactions, categories, limits, and theme).

**Validates: Requirements 9.3**

---

## Error Handling

### localStorage Unavailability (on load)

Detected in `Storage.isAvailable()` before `App.init()` proceeds. If unavailable:
- `State` is populated with defaults (empty transactions, default categories, no limits, light theme).
- `Renderer.showStorageWarning("Data persistence is unavailable. Changes will not be saved.")` is called.
- The app continues in in-memory mode for the session.

### localStorage Read Failure (on load)

`Storage.load(key, fallback)` wraps `JSON.parse` in a `try/catch` and returns `fallback` on any error. Individual failures are silent at the module level; `App.init()` uses safe fallbacks for each key.

### localStorage Write Failure (transaction create/delete)

`Storage.save(key, value)` wraps `localStorage.setItem` in a `try/catch`. On failure:
- It returns `false` to the caller.
- `EventHandlers` checks the return value and calls `Renderer.showStorageWarning("Save failed. Your change is shown but may not persist.")`.
- In-memory state and UI are updated regardless.

### Unsupported Browser APIs

`App.init()` checks for `localStorage` and `HTMLCanvasElement` support at startup. If either is missing:
- A visible error message is displayed naming the unsupported API.
- No JavaScript exception propagates unhandled (`window.onerror` is set as a last-resort safety net).

### Chart.js CDN Failure

If Chart.js fails to load (detected by `typeof Chart === "undefined"` in `ChartManager.init`):
- `ChartManager.init` returns without creating an instance.
- The chart canvas is hidden and replaced with an error message: "Chart unavailable — could not load Chart.js."
- All other app functionality continues normally.

### Input Validation Errors

Inline errors are rendered adjacent to each invalid field using `role="alert"` `<span>` elements. Errors are cleared on the next submission attempt or when the field receives a new `input` event.

---

## Testing Strategy

### Dual Testing Approach

The feature uses two complementary test types:

**Unit / Example tests** — verify specific behaviors, edge cases, and error conditions with concrete inputs.

**Property-based tests** — verify universal properties across many randomly generated inputs. The chosen library is **fast-check** (loaded in the test environment; not bundled in the deliverable).

Property tests run a minimum of **100 iterations** per property. Each test is tagged with a comment in the format:

```
// Feature: expense-budget-tracker, Property N: <property_text>
```

### What to Unit Test

- The form renders with the three default categories (Requirement 1.1)
- Empty transaction list shows the empty state message (Requirement 2.6)
- Empty chart shows placeholder state (Requirement 4.4)
- Empty monthly summary shows empty state message (Requirement 6.6)
- localStorage unavailability triggers the storage warning (Requirement 9.4)
- localStorage write failure shows warning but still updates UI (Requirement 9.5)
- Theme toggle control exists and reflects current theme (Requirement 8.1)
- Unsupported API error message (Requirement 10.6)

### What to Property Test

Each of the 25 correctness properties above is implemented as a single fast-check property-based test. Key generators needed:

```js
// Generators
fc.string({ minLength: 1, maxLength: 100 })    // item name
fc.float({ min: 0.01, max: 999999999.99 })     // valid amount
fc.string({ minLength: 1, maxLength: 50 })     // category name
fc.array(transactionArb, { minLength: 0, maxLength: 200 })  // transaction lists
fc.oneof(fc.constant("light"), fc.constant("dark"))  // theme
```

### What to Smoke Test / Test Manually

- Responsive layout at 320 px, 768 px, 1280 px, 2560 px viewports (Requirement 10.2)
- Cross-browser visual correctness in Chrome, Firefox, Edge, Safari (Requirement 10.1)
- Performance with 500 transactions — initial load ≤ 2 seconds (Requirement 10.3)
- CSS-only scrolling isolation (Requirement 2.2)
- File structure: exactly three files (Requirement 10.5)

### Test File Organization

Since this is a no-build-tool project, tests are run in a lightweight Node.js environment (e.g. `node --experimental-vm-modules` with `jest` or `vitest`) that imports the pure functions extracted from `script.js` via a thin test harness. DOM-dependent tests use `jsdom`.

The test file lives alongside the source:

```
expense-budget-tracker/
├── index.html
├── css/style.css
├── js/script.js
└── tests/
    ├── unit.test.js
    └── property.test.js
```

Test files are not part of the deliverable and are excluded from the three-file deployment.
