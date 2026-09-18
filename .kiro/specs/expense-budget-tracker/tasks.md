# Implementation Plan: Expense & Budget Tracker

## Overview

Implement the Expense & Budget Tracker as three static files (`index.html`, `css/style.css`, `js/script.js`) using Vanilla JavaScript with an IIFE module pattern. Implementation proceeds from project scaffold and infrastructure modules, through domain logic, UI rendering, and event wiring, to features and a full test suite. No build tools or frameworks are required; the app runs via `file://` protocol.

---

## Tasks

- [x] 1. Scaffold project structure and set up testing environment
  - [x] 1.1 Create the three deliverable files and test directory
    - Create `index.html` with the full HTML shell from the design: `<body data-theme="light">`, all section skeletons (`#balance-section`, `#form-section`, `#custom-category-section`, `#spending-limits-section`, `#chart-section`, `#list-section`, `#summary-section`), the `role="alert"` error spans, the Chart.js CDN `<script>` tag, and the `<link>` to `css/style.css` and `<script src="js/script.js">`
    - Create empty `css/style.css` and `js/script.js` files as placeholders
    - Create `tests/unit.test.js` and `tests/property.test.js` as empty files
    - _Requirements: 10.4, 10.5_

  - [x] 1.2 Initialize the test environment
    - Add a `package.json` with `vitest`, `jsdom`, and `fast-check` as dev dependencies
    - Configure vitest to use the `jsdom` environment and point at `tests/**/*.test.js`
    - Add an `npm test` script that runs `vitest --run`
    - Verify the test runner executes without errors against the empty test files
    - _Requirements: 10.4_

---

- [x] 2. Implement the `Storage` module in `js/script.js`
  - [x] 2.1 Write the `Storage` module
    - Inside an IIFE wrapper in `js/script.js`, define `const Storage = { ... }` with:
      - `isAvailable()` — attempts a `localStorage.setItem`/`removeItem` probe; returns `boolean`
      - `save(key, value)` — wraps `JSON.stringify` + `localStorage.setItem` in `try/catch`; returns `true` on success, `false` on failure
      - `load(key, fallback)` — wraps `localStorage.getItem` + `JSON.parse` in `try/catch`; returns `fallback` on any error
    - Use the exact key constants: `"ebt_transactions"`, `"ebt_categories"`, `"ebt_limits"`, `"ebt_theme"`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 2.2 Write property test for `Storage` round-trip
    - **Property 19: Spending limit persistence round-trip**
    - **Property 24: Storage writes precede UI render**
    - **Property 25: Full state round-trip through storage**
    - **Validates: Requirements 7.2, 9.1, 9.2, 9.3**

  - [ ]* 2.3 Write unit tests for `Storage`
    - Test `isAvailable()` returns `false` when `localStorage` is stubbed to throw
    - Test `save()` returns `false` and does not throw when `setItem` throws
    - Test `load()` returns the fallback when the stored value is malformed JSON
    - _Requirements: 9.4, 9.5_

---

- [x] 3. Implement the `State` module
  - [x] 3.1 Write the `State` module
    - Define `const State = { transactions: [], categories: ["Food","Transport","Fun"], limits: {}, theme: "light" }`
    - Implement `State.init(stored)` — merges stored transactions, custom categories (appended after defaults), limits, and theme
    - Implement `State.addTransaction(tx)` — prepends `tx` to `State.transactions`
    - Implement `State.deleteTransaction(id)` — filters out the transaction with matching `id`
    - Implement `State.addCategory(name)` — appends to `State.categories`
    - Implement `State.setLimit(category, value)` — sets `State.limits[category] = value`
    - Implement `State.setTheme(t)` — sets `State.theme = t`
    - _Requirements: 9.3_

  - [ ]* 3.2 Write property test for `State` round-trip
    - **Property 15: Custom categories round-trip through storage**
    - **Property 23: Theme preference persists and restores correctly**
    - **Validates: Requirements 5.3, 5.6, 8.3, 8.4, 9.3**

---

- [x] 4. Implement the `Validation` module
  - [x] 4.1 Write `Validation.validateTransaction`
    - Implement `validateTransaction({ name, amount, category })` as a pure function
    - name: non-empty string, ≤ 100 characters → error key `name`
    - amount: finite positive number in [0.01, 999,999,999.99] → error key `amount`
    - category: non-empty string → error key `category`
    - Return `{ valid: boolean, errors: { name?, amount?, category? } }`
    - _Requirements: 1.3, 1.4, 1.6_

  - [ ]* 4.2 Write property test for `Validation.validateTransaction`
    - **Property 2: Validator correctly classifies all inputs**
    - **Property 3: Invalid inputs are rejected without side effects**
    - **Validates: Requirements 1.3, 1.4, 1.6**

  - [x] 4.3 Write `Validation.validateCategoryName` and `Validation.validateSpendingLimit`
    - `validateCategoryName(name, existingCategories)`: name 1–50 chars, case-insensitive uniqueness check; return `{ valid, error? }`
    - `validateSpendingLimit(value)`: finite positive number in [0.01, 999,999,999.99]; return `{ valid, error? }`
    - _Requirements: 5.4, 5.5, 7.3_

  - [ ]* 4.4 Write property tests for `validateCategoryName` and `validateSpendingLimit`
    - **Property 16: Invalid category names are rejected without side effects**
    - **Property 20: Spending limit validation rejects out-of-range values**
    - **Validates: Requirements 5.4, 5.5, 7.3**

---

- [x] 5. Implement the `Formatter` module
  - [x] 5.1 Write the `Formatter` module
    - `currency(amount)` — formats as `"$1,234.56"` or `"-$1,234.56"` using `toLocaleString` or manual formatting; always 2 decimal places; leading `$` for positive, `-$` for negative
    - `date(isoString)` — extracts the UTC date portion, returns `"YYYY-MM-DD"`
    - `percentage(value, dp)` — returns `"34.5%"` rounded to `dp` decimal places
    - `monthLabel(isoString)` — returns `"July 2024"` using UTC month and year
    - `monthKey(isoString)` — returns `"2024-07"` for grouping
    - _Requirements: 2.1, 3.4, 3.5, 4.5_

  - [ ]* 5.2 Write property tests for `Formatter`
    - **Property 10: Balance is formatted as a currency string**
    - **Property 5: Transaction list renders all fields correctly** (format assertions only)
    - **Validates: Requirements 2.1, 3.4, 3.5, 3.6**

---

- [x] 6. Implement pure computation functions
  - [x] 6.1 Write `computeBalance(transactions)`
    - Pure function: returns `-(sum of all transaction amounts)`, rounded to 2 decimal places
    - Returns `0` for an empty array
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 6.2 Write property test for `computeBalance`
    - **Property 9: Balance equals the negated sum of all transaction amounts**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 6.3 Write `buildChartData(transactions, categories)`
    - Pure function: filters out transactions with `amount <= 0`, sums amounts per category
    - Returns `{ labels, data, backgroundColors, percentages }` where percentages are rounded to 1 dp
    - `backgroundColors` uses a deterministic palette array indexed by category position
    - _Requirements: 4.1, 4.5, 4.6_

  - [ ]* 6.4 Write property tests for `buildChartData`
    - **Property 11: Chart data proportions match category spending shares**
    - **Property 12: Legend percentages are correctly rounded and sum to ≈ 100%**
    - **Property 13: Zero and negative transaction amounts are excluded from chart data**
    - **Validates: Requirements 4.1, 4.5, 4.6**

  - [x] 6.5 Write `buildMonthlySummary(transactions)`
    - Pure function: groups transactions by `Formatter.monthKey(timestamp)`, sums totals and per-category totals, rounds to 2 dp
    - Returns array sorted in reverse chronological order by `monthKey`
    - Returns empty array if no transactions
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 6.6 Write property tests for `buildMonthlySummary`
    - **Property 17: Monthly summary totals equal the sum of transactions per month**
    - **Property 18: Monthly summary entries are sorted in reverse chronological order**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 6.7 Write `computeHighlights(transactions, limits)`
    - Pure function: for each category that has a limit set, computes whether the sum of transaction amounts for that category ≥ the limit
    - Returns `{ [category: string]: boolean }`
    - _Requirements: 7.4, 7.5, 7.6, 7.7_

  - [ ]* 6.8 Write property test for `computeHighlights`
    - **Property 21: Highlight status equals (category spending >= limit)**
    - **Validates: Requirements 7.4, 7.5, 7.6, 7.7**

---

- [x] 7. Checkpoint — pure module tests pass
  - Ensure all tests pass for `Storage`, `State`, `Validation`, `Formatter`, and computation functions. Ask the user if questions arise.

---

- [x] 8. Implement the `ChartManager` module
  - [x] 8.1 Write `ChartManager.init`, `ChartManager.update`, `ChartManager.showEmpty`, and `ChartManager.destroy`
    - `init(canvasId)` — checks `typeof Chart === "undefined"`; if Chart.js unavailable, hide canvas and show error message; otherwise create a `new Chart(...)` doughnut/pie instance
    - `update(transactions, categories, limits)` — calls `buildChartData`, pushes new data to the Chart.js instance, calls `chart.update()`; calls `showEmpty()` if no positive-amount transactions remain
    - `showEmpty()` — hides canvas, shows `#chart-empty` text; hides it again on next `update` with data
    - `destroy()` — calls `chart.destroy()` if instance exists
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 8.2 Write unit tests for `ChartManager`
    - Test that `init` handles missing Chart.js gracefully (stub `Chart` as undefined)
    - Test that `showEmpty` toggles the correct DOM elements
    - _Requirements: 4.4, 10.6_

---

- [x] 9. Implement the CSS design tokens, theming, and responsive layout in `css/style.css`
  - [x] 9.1 Write CSS custom properties and base layout
    - Define all `:root` tokens: `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-danger`, `--color-warning`, `--color-limit-alert`, `--color-limit-alert-border`, `--color-border`, `--spacing-sm/md/lg`, `--radius`
    - Define `[data-theme="dark"]` overrides for all color tokens
    - Apply `background: var(--color-bg)` and `color: var(--color-text)` to `body`
    - _Requirements: 8.1, 8.2_

  - [x] 9.2 Write CSS Grid responsive layout and component styles
    - Single-column layout for ≤ 600 px; two-column grid (form+list / chart+summary) for 601–1024 px; wider two-column with larger chart for ≥ 1025 px
    - `#transaction-list`: `max-height: 480px; overflow-y: auto` — internal scroll only, no outer layout shift
    - Style form field groups, error spans (hidden by default, `color: var(--color-danger)`), buttons, and the theme toggle
    - Style the spending-limit highlight class: `background: var(--color-limit-alert); border: 1px solid var(--color-limit-alert-border)`
    - Ensure all interactive controls are reachable at 320 px minimum viewport width
    - _Requirements: 2.2, 7.4, 10.1, 10.2_

---

- [x] 10. Implement the `Renderer` module
  - [x] 10.1 Write `Renderer.renderBalance` and `Renderer.renderTransactionList`
    - `renderBalance(transactions)` — computes balance via `computeBalance`, formats via `Formatter.currency`, sets `#balance-display` text content
    - `renderTransactionList(transactions, categories, limits)` — if empty shows `#list-empty`; otherwise builds a DOM entry per transaction (name, `Formatter.currency(amount)`, category, `Formatter.date(timestamp)`) with a delete button carrying `data-id`; applies limit-highlight class based on `computeHighlights`
    - _Requirements: 2.1, 2.3, 2.4, 2.6, 3.1, 3.4, 3.5, 3.6, 7.4_

  - [ ]* 10.2 Write property tests for `Renderer.renderTransactionList`
    - **Property 5: Transaction list renders all fields correctly**
    - **Property 6: New transactions are prepended to the list**
    - **Property 7: Each rendered transaction row contains a delete control**
    - **Validates: Requirements 2.1, 2.3, 2.4**

  - [x] 10.3 Write `Renderer.renderChart`, `Renderer.renderCategorySelector`, and `Renderer.renderSpendingLimitControls`
    - `renderChart(transactions, categories, limits)` — delegates to `ChartManager.update`; handles empty state via `ChartManager.showEmpty`
    - `renderCategorySelector(categories)` — clears and repopulates the `<select id="category">` with one `<option>` per category; preserves previously selected value if still valid
    - `renderSpendingLimitControls(categories, limits)` — renders a row per category in `#limits-list` with a number input pre-filled with the current limit and a "Set" button; applies highlight class to rows that have exceeded their limit
    - _Requirements: 4.2, 4.3, 4.4, 5.2, 7.4_

  - [x] 10.4 Write `Renderer.renderMonthlySummary`
    - Calls `buildMonthlySummary(transactions)`, renders months in reverse chronological order; each month shows `total` and a per-category breakdown
    - Shows `#summary-empty` message when no data exists
    - Renders into `#summary-content`
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [x] 10.5 Write `Renderer.applyTheme`, error/warning helpers
    - `applyTheme(theme)` — sets `document.body.dataset.theme = theme` and updates the toggle button's label/icon
    - `showFormErrors(errors)` / `clearFormErrors()` — sets/clears text in `#error-name`, `#error-amount`, `#error-category` spans
    - `showCategoryError(message)` / `showLimitError(category, message)` — sets/clears `#error-category-name` and per-category limit error spans
    - `showStorageWarning(message)` / `clearStorageWarning()` — shows/hides `#storage-warning` banner
    - _Requirements: 1.4, 5.4, 7.3, 8.1, 8.2, 9.4, 9.5_

  - [ ]* 10.6 Write unit tests for `Renderer` error and empty-state paths
    - Test that `#list-empty` is shown when transaction list is empty (Requirement 2.6)
    - Test that `#chart-empty` is shown when no spending data (Requirement 4.4)
    - Test that `showStorageWarning` makes the banner visible (Requirement 9.4)
    - Test that `showFormErrors` populates error spans and `clearFormErrors` empties them (Requirement 1.4)
    - _Requirements: 1.4, 2.6, 4.4, 9.4_

---

- [ ] 11. Implement the `EventHandlers` module
  - [ ] 11.1 Write `EventHandlers.onTransactionSubmit` and `EventHandlers.onDeleteTransaction`
    - `onTransactionSubmit(event)` — prevents default; reads form values; calls `Validation.validateTransaction`; on failure calls `Renderer.showFormErrors`; on success creates a Transaction object (`id` via `crypto.randomUUID()` or `Date.now().toString()` fallback, UTC `timestamp`), calls `State.addTransaction`, calls `Storage.save` (shows warning on failure), calls `App.render()`, clears form and returns focus to `#item-name`
    - `onDeleteTransaction(event)` — event delegation on `#transaction-list`; reads `data-id` from closest delete button; calls `State.deleteTransaction`, `Storage.save`, `App.render()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.3, 2.5, 9.1, 9.2_

  - [ ]* 11.2 Write property tests for transaction create/delete
    - **Property 1: Valid transaction submission creates a new transaction**
    - **Property 4: Form clears after successful submission**
    - **Property 8: Delete removes the transaction and updates storage**
    - **Validates: Requirements 1.2, 1.5, 2.3, 2.5, 9.1, 9.2**

  - [ ] 11.3 Write `EventHandlers.onAddCategory`, `EventHandlers.onSetLimit`, `EventHandlers.onThemeToggle`
    - `onAddCategory(event)` — reads `#new-category`; calls `Validation.validateCategoryName`; on failure shows error; on success calls `State.addCategory`, `Storage.save("ebt_categories", State.categories)`, `App.render()`, clears input
    - `onSetLimit(category, event)` — reads numeric input; calls `Validation.validateSpendingLimit`; on failure shows per-category error; on success calls `State.setLimit`, `Storage.save("ebt_limits", State.limits)`, `App.render()`
    - `onThemeToggle()` — toggles `State.theme` between `"light"` and `"dark"`, calls `State.setTheme`, `Storage.save("ebt_theme", State.theme)`, `Renderer.applyTheme`
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3_

  - [ ]* 11.4 Write property tests for theme toggle
    - **Property 22: Theme toggle is a round-trip**
    - **Validates: Requirements 8.2**

  - [ ] 11.5 Write `EventHandlers.onShowSummary` and `EventHandlers.onHideSummary`
    - `onShowSummary()` — calls `Renderer.renderMonthlySummary(State.transactions)`, shows `#summary-content`, swaps button to "Hide Summary"
    - `onHideSummary()` — hides `#summary-content`, swaps button back to "Show Summary"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

---

- [ ] 12. Implement the `App` module and wire everything together
  - [ ] 12.1 Write `App.init` and `App.render`
    - `App.init()` — (called on `DOMContentLoaded`) checks browser support for `localStorage` and `HTMLCanvasElement`; if either missing shows named error and aborts; checks `Storage.isAvailable()`, shows storage warning if not; hydrates `State` via `State.init` for all four keys with safe fallbacks; calls `Renderer.applyTheme(State.theme)`; attaches all event listeners via `EventHandlers`; calls `ChartManager.init("spending-chart")`; calls `App.render()`
    - `App.render()` — calls in order: `Renderer.renderBalance`, `Renderer.renderTransactionList`, `Renderer.renderChart`, `Renderer.renderCategorySelector`, `Renderer.renderSpendingLimitControls`
    - Wrap the entire `script.js` in an IIFE to prevent global namespace pollution
    - _Requirements: 8.4, 9.3, 9.4, 10.3, 10.6_

  - [ ]* 12.2 Write unit tests for `App.init` startup paths
    - Test that missing `localStorage` support shows an error and does not throw (Requirement 10.6)
    - Test that `Storage.isAvailable() === false` shows the storage warning (Requirement 9.4)
    - Test that `App.init` restores theme before first render (Requirement 8.4)
    - _Requirements: 8.4, 9.4, 10.6_

  - [ ]* 12.3 Write property test for full state round-trip
    - **Property 25: Full state round-trip through storage**
    - **Validates: Requirements 9.3**

---

- [ ] 13. Checkpoint — full integration tests pass
  - Ensure all unit and property tests pass. Confirm the three-file structure (`index.html`, `css/style.css`, `js/script.js`) is correct and the app opens via `file://` without errors. Ask the user if questions arise.

---

- [ ] 14. Implement remaining edge cases and browser compatibility guards
  - [ ] 14.1 Add `window.onerror` safety net and CDN failure guard
    - Add `window.onerror = (msg, src, line) => { /* log silently */ }` as a last-resort handler so no unhandled JS exception surfaces to the user
    - In `ChartManager.init`, check `typeof Chart === "undefined"` after the CDN `<script>` tag; hide `<canvas>` and show a `"Chart unavailable — could not load Chart.js."` message
    - _Requirements: 10.6_

  - [ ] 14.2 Add `localStorage` read/write failure resilience throughout event handlers
    - Verify all `Storage.save` call sites check the return value and call `Renderer.showStorageWarning` on `false`
    - Verify all state mutations proceed even when `Storage.save` fails (in-memory state is always updated)
    - _Requirements: 9.5_

  - [ ] 14.3 Validate amount rendering and balance edge cases
    - Confirm `Formatter.currency` handles `0`, large values up to `999,999,999.99`, and negative balances producing `"-$..."` strings matching `/^-?\$[\d,]+\.\d{2}$/`
    - Confirm `computeBalance` returns `0.00` when `State.transactions` is empty
    - _Requirements: 3.4, 3.5, 3.6_

  - [ ]* 14.4 Write unit test for unsupported browser API messaging
    - Stub `window.localStorage` as `undefined` and `HTMLCanvasElement` as `undefined`; verify the correct error message appears and no exception propagates
    - _Requirements: 10.6_

---

- [ ] 15. Final checkpoint — all tests pass and app runs end-to-end via file://
  - Run `npm test` (vitest --run); all unit and property tests must pass. Open `index.html` directly in a browser, add a transaction, verify balance updates, chart renders, delete transaction, toggle theme, add a custom category, set a spending limit, view monthly summary. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they are property-based or unit tests
- Each task references specific requirements for full traceability
- Checkpoints at tasks 7, 13, and 15 ensure incremental validation after each major phase
- Property tests use `fast-check` and must be tagged `// Feature: expense-budget-tracker, Property N: <text>`
- All 25 correctness properties defined in `design.md` are covered by property test sub-tasks
- The `tests/` directory is not part of the three-file deliverable — exclude from deployment
- The IIFE in `script.js` must be the outermost wrapper; all modules are defined inside it

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1", "9.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "4.3", "5.2", "6.1", "6.3", "6.5", "6.7", "9.2"] },
    { "id": 3, "tasks": ["4.2", "4.4", "6.2", "6.4", "6.6", "6.8", "8.1"] },
    { "id": 4, "tasks": ["8.2", "10.1", "10.3", "10.4", "10.5"] },
    { "id": 5, "tasks": ["10.2", "10.6", "11.1", "11.3", "11.5"] },
    { "id": 6, "tasks": ["11.2", "11.4", "12.1"] },
    { "id": 7, "tasks": ["12.2", "12.3", "14.1", "14.2", "14.3"] },
    { "id": 8, "tasks": ["14.4"] }
  ]
}
```
