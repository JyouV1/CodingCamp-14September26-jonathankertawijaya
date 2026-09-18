# Requirements Document

## Introduction

The Expense & Budget Tracker is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It enables users to record, categorize, and visualize personal financial transactions entirely within the browser using the Local Storage API. The app provides an input form, a scrollable transaction list, a live total balance display, a pie chart for spending distribution, custom categories, a monthly summary view, per-category spending limits with visual alerts, and a dark/light mode toggle. No server, framework, or build tool is required — the app runs as a standalone HTML file.

## Glossary

- **App**: The Expense & Budget Tracker web application.
- **Transaction**: A single recorded financial entry consisting of an item name, a numeric amount, a category, and a timestamp.
- **Category**: A label applied to a Transaction. Default categories are Food, Transport, and Fun. Users may add Custom Categories.
- **Custom Category**: A user-defined Category added at runtime and persisted in Local Storage.
- **Balance**: The running total computed as the sum of all Transaction amounts currently stored.
- **Spending Limit**: A user-defined maximum spending threshold for a specific Category.
- **Local_Storage**: The browser's Local Storage API used as the sole persistence mechanism.
- **Chart**: The pie chart rendered by Chart.js that visualises spending distribution by Category.
- **Monthly_Summary**: An aggregated view of Transactions grouped and totalled by calendar month.
- **Theme**: The visual color scheme of the App, either light mode or dark mode.
- **Form**: The transaction input form containing the Item Name, Amount, and Category fields.
- **Transaction_List**: The scrollable UI region that displays all recorded Transactions.
- **Validator**: The client-side input validation logic applied before a Transaction is saved.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to enter a transaction via a form with item name, amount, and category fields, so that I can record my expenses quickly.

#### Acceptance Criteria

1. THE App SHALL render the Form with an Item Name text field (maximum 100 characters), an Amount numeric field, and a Category selector containing at minimum the default categories Food, Transport, and Fun.
2. WHEN the user submits the Form with all fields filled and a positive numeric Amount between 0.01 and 999,999,999.99, THE App SHALL create a new Transaction with a UTC timestamp and add it to the Transaction_List within 1 second.
3. WHEN the user submits the Form, THE Validator SHALL verify that the Item Name field is not empty and does not exceed 100 characters, the Amount field contains a positive number between 0.01 and 999,999,999.99, and a Category is selected.
4. IF the Validator detects one or more empty or invalid fields on form submission, THEN THE App SHALL display an inline error message adjacent to each invalid field and SHALL NOT create a Transaction.
5. WHEN a Transaction is successfully created, THE App SHALL clear all Form fields and return focus to the Item Name field.
6. IF the Item Name exceeds 100 characters, THEN THE Validator SHALL reject the submission and display an inline error message on the Item Name field indicating the maximum length, without creating a Transaction.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see a scrollable list of all my transactions with their name, amount, and category, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every stored Transaction showing the item name (up to 100 characters), the amount formatted as a decimal number with exactly 2 decimal places and a currency symbol, the category label, and the recorded date formatted as YYYY-MM-DD.
2. WHILE the number of Transactions exceeds the visible area of the Transaction_List container, THE App SHALL allow vertical scrolling within that container without affecting the position or layout of any element outside that container.
3. WHEN a new Transaction is created, THE Transaction_List SHALL prepend the new entry at the top of the list and display it within 500 milliseconds without requiring a page reload.
4. THE Transaction_List SHALL render each Transaction with a delete control visually associated with that entry and positioned within the same row or card as the Transaction it targets.
5. WHEN the user activates the delete control for a Transaction, THE App SHALL remove that Transaction from Local_Storage and remove its entry from the Transaction_List within 500 milliseconds.
6. IF Local_Storage contains no Transactions, THEN THE Transaction_List SHALL display a message indicating that no transactions have been recorded yet.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total balance prominently at the top of the page, so that I can immediately know my overall financial position.

#### Acceptance Criteria

1. THE App SHALL display the Balance as the sum of all stored Transaction amounts at the top of the page, where all Transaction amounts are treated as expenses and subtracted from zero.
2. WHEN a Transaction is created, THE App SHALL recalculate and update the displayed Balance within the same UI render cycle, requiring no user action.
3. WHEN a Transaction is deleted, THE App SHALL recalculate and update the displayed Balance within the same UI render cycle, requiring no user action.
4. THE App SHALL format the Balance as a currency value with exactly two decimal places and a currency symbol preceding the numeric value.
5. IF the Balance is negative, THEN THE App SHALL display the Balance with a leading minus sign before the currency symbol.
6. IF no Transactions are stored, THEN THE App SHALL display the Balance as zero formatted according to criterion 4.

---

### Requirement 4: Visual Spending Chart

**User Story:** As a user, I want a pie chart showing my spending distribution by category, so that I can understand where my money is going at a glance.

#### Acceptance Criteria

1. THE App SHALL render a pie chart using Chart.js that displays each Category's share of total spending as a proportional segment, where each segment's arc length is proportional to that Category's percentage of total spending.
2. WHEN a Transaction is created, THE Chart SHALL update to reflect the new spending distribution within 500 milliseconds without requiring a page reload.
3. WHEN a Transaction is deleted, THE Chart SHALL update to reflect the revised spending distribution within 500 milliseconds without requiring a page reload.
4. IF no Transactions are stored, THEN THE Chart SHALL display a placeholder state that replaces both the pie segments and the legend with a text message indicating that no spending data is available.
5. THE Chart SHALL display a legend mapping each Category label to its corresponding segment color, showing the percentage rounded to one decimal place, up to a maximum of 20 legend entries.
6. IF a Transaction amount is zero or negative, THEN THE Chart SHALL exclude that Transaction from the spending distribution calculation.

---

### Requirement 5: Custom Categories

**User Story:** As a user, I want to add my own spending categories beyond the defaults, so that I can track expenses that don't fit standard labels.

#### Acceptance Criteria

1. THE App SHALL provide a text input and a submit control that allows the user to enter and save a new Custom Category name between 1 and 50 characters.
2. WHEN a Custom Category is saved, THE App SHALL add it to the Category selector in the Form and to any Category filter or summary view immediately.
3. WHEN a Custom Category is saved, THE App SHALL persist it in Local_Storage so that it remains available after a page reload.
4. IF the user attempts to save a Custom Category with an empty name or a name exceeding 50 characters, THEN THE App SHALL display an error message indicating the naming rule and SHALL NOT create the Category.
5. IF the user attempts to save a Custom Category whose name matches an existing Category name (case-insensitive), THEN THE App SHALL display an error message indicating the duplicate and SHALL NOT create a duplicate Category.
6. WHEN the App initializes, THE App SHALL restore all Custom Categories from Local_Storage and make them available in the Category selector before the Form is rendered.

---

### Requirement 6: Monthly Summary View

**User Story:** As a user, I want to see a summary of my spending grouped by month, so that I can track my financial trends over time.

#### Acceptance Criteria

1. THE App SHALL provide a Monthly_Summary view that groups Transactions by calendar month and year and displays the total spending per month, where total spending is the sum of all Transaction amounts for that month rounded to 2 decimal places.
2. WHEN the user navigates to the Monthly_Summary view, THE App SHALL display each month's total spending broken down by Category, where each Category entry shows the Category name and the sum of Transaction amounts for that Category in that month rounded to 2 decimal places.
3. WHEN the user navigates to the Monthly_Summary view, THE App SHALL list months in reverse chronological order with the most recent month displayed first.
4. WHEN a Transaction is created or deleted, THE Monthly_Summary SHALL reflect the updated totals the next time the user navigates to the Monthly_Summary view.
5. IF no Transactions exist for a given month, THEN THE App SHALL omit that month from the Monthly_Summary.
6. IF the user navigates to the Monthly_Summary view and no Transactions exist across any month, THEN THE App SHALL display an empty state message indicating no spending data is available.

---

### Requirement 7: Spending Limit Alerts

**User Story:** As a user, I want to set a spending limit per category and be alerted when I exceed it, so that I can stay within my budget.

#### Acceptance Criteria

1. THE App SHALL allow the user to set a numeric Spending Limit between 0.01 and 999,999,999.99 for any Category, including Custom Categories.
2. WHEN the user sets a Spending Limit, THE App SHALL persist it in Local_Storage associated with the corresponding Category.
3. IF the user submits a Spending Limit that is not a positive number within the range 0.01 to 999,999,999.99, THEN THE App SHALL reject the input and display an error message indicating that a valid positive number is required, without saving the value.
4. WHEN the total spending for a Category meets or exceeds its Spending Limit, THE App SHALL visually highlight that Category in the Transaction_List and the Chart legend to indicate the limit has been reached or exceeded.
5. WHEN a Transaction is added and the total spending for a Category meets or exceeds its Spending Limit, THE App SHALL apply the highlight to that Category within 1 second of the change being confirmed.
6. WHEN a Transaction is deleted and the remaining total for a Category falls below its Spending Limit, THE App SHALL remove the highlight for that Category.
7. IF no Spending Limit has been set for a Category, THEN THE App SHALL apply no highlight to that Category regardless of its total spending.

---

### Requirement 8: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light visual themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control that switches the Theme between light mode and dark mode, where the toggle visually indicates the currently active Theme.
2. WHEN the user activates the toggle, THE App SHALL apply the selected Theme to all visible UI elements within 100 milliseconds without a page reload.
3. WHEN the user activates the toggle, THE App SHALL persist the selected Theme preference as a single value ("light" or "dark") in Local_Storage.
4. WHEN the App loads, THE App SHALL restore the previously persisted Theme preference from Local_Storage before rendering the UI, defaulting to light mode if no preference is stored.
5. IF the Local_Storage read operation fails during App load, THEN THE App SHALL apply light mode as the default Theme and render the UI without displaying an error to the user.

---

### Requirement 9: Data Persistence and Restore

**User Story:** As a user, I want my data to be saved automatically so that I don't lose transactions when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE App SHALL write the updated Transaction list to Local_Storage before the UI update is visible to the user.
2. WHEN a Transaction is deleted, THE App SHALL write the updated Transaction list to Local_Storage before the UI update is visible to the user.
3. WHEN the App loads, THE App SHALL read all Transactions, Custom Categories, Spending Limits, and the Theme preference from Local_Storage and restore the full application state before any UI is rendered.
4. IF Local_Storage is unavailable or reading from Local_Storage fails on App load, THEN THE App SHALL display a warning message indicating that data persistence is unavailable and SHALL continue operating in-memory for the current session.
5. IF a Local_Storage write operation fails during Transaction create or delete, THEN THE App SHALL display a warning message indicating the write failed, but SHALL still update the in-memory state and the UI to reflect the change.

---

### Requirement 10: Browser Compatibility and Responsive Layout

**User Story:** As a user, I want the app to work correctly on any modern browser and device, so that I can use it on desktop and mobile without issues.

#### Acceptance Criteria

1. THE App SHALL be functional and visually correct in the latest stable releases of Chrome, Firefox, Edge, and Safari without polyfills or browser-specific workarounds, where "functional" means all user interactions produce the expected outcome, and "visually correct" means no UI element is hidden, overlapping, or truncated due to browser rendering differences.
2. THE App SHALL use a responsive CSS layout so that all UI elements — Form, Transaction_List, Chart, and Monthly_Summary — are usable on viewport widths from 320 px to 2560 px, where "usable" means all interactive controls are reachable, all text is readable without horizontal scrolling, and no content is clipped beyond the viewport boundary.
3. THE App SHALL complete the initial render and restore application state from Local_Storage within 2 seconds, measured from the browser's load event to all four UI elements being fully visible and interactive, on a standard desktop machine with up to 500 stored Transactions.
4. THE App SHALL use only HTML, CSS, and Vanilla JavaScript; no JavaScript frameworks, CSS preprocessors, or build tools are required to run the App.
5. THE App SHALL be deliverable as exactly three static files — index.html, css/style.css, and js/script.js — that can be opened directly in a browser via the file:// protocol without a web server, with all App functionality fully operational.
6. IF the App is opened in a browser that does not support a Web API used by the App (such as Local_Storage or the Canvas API), THEN THE App SHALL display an error message indicating which feature is unsupported and instruct the user to upgrade their browser, without throwing an unhandled JavaScript exception.
