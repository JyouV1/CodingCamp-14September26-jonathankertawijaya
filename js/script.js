/* js/script.js — Expense & Budget Tracker */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // localStorage key constants
  // ---------------------------------------------------------------------------
  var KEYS = {
    TRANSACTIONS: 'ebt_transactions',
    CATEGORIES:   'ebt_categories',
    LIMITS:       'ebt_limits',
    THEME:        'ebt_theme'
  };

  // ---------------------------------------------------------------------------
  // Storage — read/write localStorage safely
  // ---------------------------------------------------------------------------
  var Storage = {
    isAvailable: function () {
      try {
        var probe = '__ebt_probe__';
        localStorage.setItem(probe, '1');
        localStorage.removeItem(probe);
        return true;
      } catch (e) {
        return false;
      }
    },
    save: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    load: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Validation — pure input validation
  // ---------------------------------------------------------------------------
  var Validation = {
    validateTransaction: function (fields) {
      var name = fields.name;
      var amount = fields.amount;
      var category = fields.category;
      var errors = {};

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.name = 'Item name is required.';
      } else if (name.length > 100) {
        errors.name = 'Item name must not exceed 100 characters.';
      }

      var amt = Number(amount);
      if (!isFinite(amt) || amt < 1000 || amt > 999999999) {
        errors.amount = 'Amount must be between 1.000 and 999.999.999.';
      }

      if (!category || typeof category !== 'string' || category.trim().length === 0) {
        errors.category = 'Please select a category.';
      }

      return { valid: Object.keys(errors).length === 0, errors: errors };
    },

    validateCategoryName: function (name, existingCategories) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return { valid: false, error: 'Category name is required.' };
      }
      if (name.length > 50) {
        return { valid: false, error: 'Category name must not exceed 50 characters.' };
      }
      var lower = name.toLowerCase();
      var exists = (existingCategories || []).some(function (c) {
        return c.toLowerCase() === lower;
      });
      if (exists) {
        return { valid: false, error: 'A category with this name already exists.' };
      }
      return { valid: true };
    },

    validateSpendingLimit: function (value) {
        var num = Number(value);

        if (
            !isFinite(num) ||
            num < 1000 ||
            num > 999999999 ||
            num % 1000 !== 0
        ) {
            return {
                valid: false,
                error: 'Limit must be between 1.000 and 999.999.999'
            };
        }

        return { valid: true };
    }
  };

  // ---------------------------------------------------------------------------
  // Formatter — pure display helpers
  // ---------------------------------------------------------------------------
  var Formatter = {
    currency: function (amount) {
      var abs = Math.abs(amount);
      var parts = abs.toFixed(2).split(',');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      var formatted = abs.toLocaleString('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
      return amount < 0 ? '-Rp' + formatted : 'Rp' + formatted;
    },
    date: function (isoString) {
      return isoString.substring(0, 10);
    },
    percentage: function (value, dp) {
      return value.toFixed(dp) + '%';
    },
    monthLabel: function (isoString) {
      var d = new Date(isoString);
      var months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return months[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    },
    monthKey: function (isoString) {
      return isoString.substring(0, 7);
    }
  };

  // ---------------------------------------------------------------------------
  // Pure computation functions
  // ---------------------------------------------------------------------------
  function computeBalance(transactions) {
    if (!transactions || transactions.length === 0) return 0;
    var sum = transactions.reduce(function (acc, tx) {
      return acc + (Number(tx.amount) || 0);
    }, 0);
    return Math.round(-sum * 100) / 100;
  }

  function computeHighlights(transactions, limits) {
    if (!limits || typeof limits !== 'object') return {};
    var totals = {};
    (transactions || []).forEach(function (tx) {
      totals[tx.category] = (totals[tx.category] || 0) + Number(tx.amount);
    });
    var result = {};
    Object.keys(limits).forEach(function (cat) {
      var limit = limits[cat];
      if (limit != null) {
        result[cat] = (totals[cat] || 0) >= limit;
      }
    });
    return result;
  }

  function buildMonthlySummary(transactions) {
    if (!transactions || transactions.length === 0) return [];
    var groups = {};
    transactions.forEach(function (tx) {
      var key = Formatter.monthKey(tx.timestamp);
      if (!groups[key]) {
        groups[key] = {
          monthKey: key,
          monthLabel: Formatter.monthLabel(tx.timestamp),
          total: 0,
          byCategory: {}
        };
      }
      var amt = Number(tx.amount) || 0;
      groups[key].total += amt;
      groups[key].byCategory[tx.category] =
        (groups[key].byCategory[tx.category] || 0) + amt;
    });
    var result = Object.keys(groups).map(function (key) {
      var g = groups[key];
      var out = {
        monthKey: g.monthKey,
        monthLabel: g.monthLabel,
        total: Math.round(g.total * 100) / 100,
        byCategory: {}
      };
      Object.keys(g.byCategory).forEach(function (cat) {
        out.byCategory[cat] = Math.round(g.byCategory[cat] * 100) / 100;
      });
      return out;
    });
    result.sort(function (a, b) { return b.monthKey.localeCompare(a.monthKey); });
    return result;
  }

  var CHART_COLORS = [
    '#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#d97706',
    '#65a30d', '#0891b2', '#0284c7', '#7c2d12', '#365314',
    '#1e3a5f', '#4a1942', '#831843', '#78350f', '#064e3b',
    '#1e40af', '#6b21a8', '#be185d', '#991b1b', '#92400e'
  ];

  function buildChartData(transactions, categories) {
    var positive = (transactions || []).filter(function (tx) {
      return Number(tx.amount) > 0;
    });
    var totals = {};
    positive.forEach(function (tx) {
      totals[tx.category] = (totals[tx.category] || 0) + Number(tx.amount);
    });
    var labels = [], data = [], backgroundColors = [];
    (categories || []).forEach(function (cat, i) {
      if (totals[cat] !== undefined) {
        labels.push(cat);
        data.push(Math.round(totals[cat] * 100) / 100);
        backgroundColors.push(CHART_COLORS[i % CHART_COLORS.length]);
      }
    });
    var total = data.reduce(function (s, v) { return s + v; }, 0);
    var percentages = data.map(function (v) {
      return total > 0 ? parseFloat((v / total * 100).toFixed(1)) : 0;
    });
    return { labels: labels, data: data, backgroundColors: backgroundColors, percentages: percentages };
  }

  // ---------------------------------------------------------------------------
  // State — in-memory app state
  // ---------------------------------------------------------------------------
  var DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

  var State = {
    transactions: [],
    categories: DEFAULT_CATEGORIES.slice(),
    limits: {},
    theme: 'light',

    init: function (stored) {
      if (!stored || typeof stored !== 'object') return;
      if (Array.isArray(stored.transactions)) {
        State.transactions = stored.transactions;
      }
      if (Array.isArray(stored.categories) && stored.categories.length > 0) {
        State.categories = stored.categories.slice();
        } else {
        State.categories = DEFAULT_CATEGORIES.slice();
        }
      if (Array.isArray(stored.categories)) {
        var lowerDefaults = DEFAULT_CATEGORIES.map(function (c) { return c.toLowerCase(); });
        stored.categories.forEach(function (cat) {
          if (typeof cat === 'string' && cat.trim().length > 0 &&
              lowerDefaults.indexOf(cat.toLowerCase()) === -1) {
            var lowerCurrent = State.categories.map(function (c) { return c.toLowerCase(); });
            if (lowerCurrent.indexOf(cat.toLowerCase()) === -1) {
              State.categories.push(cat);
            }
          }
        });
      }
      if (stored.limits !== null && typeof stored.limits === 'object' &&
          !Array.isArray(stored.limits)) {
        State.limits = stored.limits;
      }
      if (stored.theme === 'light' || stored.theme === 'dark') {
        State.theme = stored.theme;
      }
    },
    addTransaction: function (tx) { State.transactions.unshift(tx); },
    deleteTransaction: function (id) {
      State.transactions = State.transactions.filter(function (tx) { return tx.id !== id; });
    },
    addCategory: function (name) { State.categories.push(name); },
    deleteCategory: function (name) {
      State.categories = State.categories.filter(function (cat) { return cat !== name; });
      delete State.limits[name];
    },
    setLimit: function (cat, value) { State.limits[cat] = value; },
    setTheme: function (t) { State.theme = t; }
  };

  // ---------------------------------------------------------------------------
  // ChartManager — owns the Chart.js instance
  // ---------------------------------------------------------------------------
  var ChartManager = (function () {
    var _chart = null;
    var _canvasEl = null;
    var _emptyEl = null;

    function showCanvas() {
      if (_canvasEl) _canvasEl.hidden = false;
      if (_emptyEl)  _emptyEl.hidden  = true;
    }
    function hideCanvas() {
      if (_canvasEl) _canvasEl.hidden = true;
      if (_emptyEl)  _emptyEl.hidden  = false;
    }

    return {
      init: function (canvasId) {
        _canvasEl = document.getElementById(canvasId);
        _emptyEl  = document.getElementById('chart-empty');

        if (typeof Chart === 'undefined') {
          hideCanvas();
          if (_emptyEl) {
            _emptyEl.textContent = 'Chart unavailable — Chart.js failed to load.';
          }
          return;
        }
        if (!_canvasEl) return;

        _chart = new Chart(_canvasEl.getContext('2d'), {
          type: 'doughnut',
          data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 2 }] },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  generateLabels: function (chart) {
                    var d = chart.data;
                    var pcts = chart._pcts || [];
                    return (d.labels || []).map(function (label, i) {
                      return {
                        text: label + (pcts[i] !== undefined ? ' (' + pcts[i] + '%)' : ''),
                        fillStyle: d.datasets[0].backgroundColor[i],
                        index: i
                      };
                    });
                  }
                }
              }
            }
          }
        });
      },

      update: function (transactions, categories) {
        if (!_chart) return;
        var cd = buildChartData(transactions, categories);
        if (cd.data.length === 0) { this.showEmpty(); return; }
        showCanvas();
        _chart._pcts = cd.percentages.slice();
        _chart.data.labels = cd.labels;
        _chart.data.datasets[0].data = cd.data;
        _chart.data.datasets[0].backgroundColor = cd.backgroundColors;
        _chart.update();
      },

      showEmpty: function () { hideCanvas(); },

      destroy: function () {
        if (_chart) { _chart.destroy(); _chart = null; }
      }
    };
  })();

  // ---------------------------------------------------------------------------
  // Renderer — all DOM updates
  // ---------------------------------------------------------------------------
  var Renderer = {
    renderBalance: function (transactions) {
      var el = document.getElementById('balance-display');
      if (el) el.textContent = Formatter.currency(computeBalance(transactions));
    },

    renderTransactionList: function (transactions, limits) {
      var container = document.getElementById('transaction-list');
      var emptyMsg  = document.getElementById('list-empty');
      if (!container) return;

      container.querySelectorAll('.transaction-item').forEach(function (el) { el.remove(); });

      if (!transactions || transactions.length === 0) {
        if (emptyMsg) emptyMsg.hidden = false;
        return;
      }
      if (emptyMsg) emptyMsg.hidden = true;

      var highlights = computeHighlights(transactions, limits || {});

      transactions.forEach(function (tx) {
        var div = document.createElement('div');
        div.className = 'transaction-item' + (highlights[tx.category] ? ' limit-exceeded' : '');
        div.setAttribute('role', 'listitem');
        div.setAttribute('data-id', tx.id);

        var nameEl = document.createElement('span');
        nameEl.className = 'tx-name';
        nameEl.textContent = tx.name;

        var catPill = document.createElement('span');
        catPill.className = 'tx-category';
        catPill.textContent = tx.category;

        var amountEl = document.createElement('span');
        amountEl.className = 'tx-amount';
        amountEl.textContent = Formatter.currency(tx.amount);

        var metaEl = document.createElement('span');
        metaEl.className = 'tx-meta';
        metaEl.textContent = Formatter.date(tx.timestamp);

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.setAttribute('data-id', tx.id);
        deleteBtn.setAttribute('aria-label', 'Delete ' + tx.name);
        deleteBtn.textContent = '✕';

        div.appendChild(nameEl);
        div.appendChild(catPill);
        div.appendChild(amountEl);
        div.appendChild(metaEl);
        div.appendChild(deleteBtn);
        container.appendChild(div);
      });
    },

    renderChart: function (transactions, categories) {
      ChartManager.update(transactions, categories);
    },

    renderCategorySelector: function (categories) {
      var select = document.getElementById('category');
      if (!select) return;
      var prev = select.value;
      select.innerHTML = '';
      (categories || []).forEach(function (cat) {
        var opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
      });
      // "＋ Add category…" sentinel at the bottom
      var addOpt = document.createElement('option');
      addOpt.value = '__add_category__';
      addOpt.textContent = '＋ Add category…';
      addOpt.className = 'add-category-option';
      select.appendChild(addOpt);

      if (prev && (categories || []).indexOf(prev) !== -1) select.value = prev;
    },

    renderSpendingLimitControls: function (categories, limits, transactions) {
      var container = document.getElementById('limits-list');
      if (!container) return;
      container.innerHTML = '';

      var highlights = computeHighlights(transactions || [], limits || {});

      (categories || []).forEach(function (cat) {
        var currentLimit = (limits || {})[cat];
        var exceeded = highlights[cat] === true;
        var slug = cat.replace(/\s+/g, '-').toLowerCase();

        var row = document.createElement('div');
        row.className = 'limit-row' + (exceeded ? ' limit-exceeded' : '');
        row.setAttribute('data-category', cat);

        var label = document.createElement('label');
        label.textContent = cat;
        label.htmlFor = 'limit-input-' + slug;

        var input = document.createElement('input');
        input.type = 'number';
        input.id = 'limit-input-' + slug;
        input.min = '1000';
        input.max = '999999999';
        input.step = '1000';
        input.placeholder = 'No limit';
        input.setAttribute('data-category', cat);
        if (currentLimit !== undefined) input.value = currentLimit;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-set-limit';
        btn.textContent = 'Set';
        btn.setAttribute('data-category', cat);

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-delete-category';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('data-category', cat);
        deleteBtn.setAttribute('aria-label', 'Delete category ' + cat);

        var errorSpan = document.createElement('span');
        errorSpan.className = 'limit-error';
        errorSpan.id = 'error-limit-' + slug;

        var deleteErrorSpan = document.createElement('span');
        deleteErrorSpan.className = 'category-delete-error';
        deleteErrorSpan.id = 'error-delete-' + slug;

        row.appendChild(label);
        row.appendChild(input);
        row.appendChild(btn);
        row.appendChild(deleteBtn);
        row.appendChild(errorSpan);
        row.appendChild(deleteErrorSpan);
        container.appendChild(row);
      });
    },

    renderMonthlySummary: function (transactions) {
      var container = document.getElementById('summary-content');
      if (!container) return;
      container.innerHTML = '';

      var summary = buildMonthlySummary(transactions);
      if (!summary || summary.length === 0) {
        var empty = document.createElement('p');
        empty.id = 'summary-empty';
        container.appendChild(empty);
        return;
      }

      summary.forEach(function (entry) {
        var monthDiv = document.createElement('div');
        monthDiv.className = 'summary-month';

        var heading = document.createElement('h3');
        var lblSpan = document.createElement('span');
        lblSpan.textContent = entry.monthLabel;
        var totalSpan = document.createElement('span');
        totalSpan.className = 'summary-total';
        totalSpan.textContent = Formatter.currency(entry.total);
        heading.appendChild(lblSpan);
        heading.appendChild(totalSpan);
        monthDiv.appendChild(heading);

        Object.keys(entry.byCategory).forEach(function (cat) {
          var row = document.createElement('div');
          row.className = 'summary-category-row';
          var lbl = document.createElement('span');
          lbl.textContent = cat;
          var amt = document.createElement('span');
          amt.textContent = Formatter.currency(entry.byCategory[cat]);
          row.appendChild(lbl);
          row.appendChild(amt);
          monthDiv.appendChild(row);
        });

        container.appendChild(monthDiv);
      });
    },

    applyTheme: function (theme) {
      document.body.dataset.theme = theme;
      var btn = document.getElementById('theme-toggle');
      if (btn) {
        var isDark = theme === 'dark';
        btn.innerHTML = isDark
          ? '<svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>'
          : '<svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 15.2A8.5 8.5 0 0 1 8.8 3.3 8.5 8.5 0 1 0 20.7 15.2Z"></path></svg>';
        btn.setAttribute('aria-label',
          isDark ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('title',
          isDark ? 'Switch to light mode' : 'Switch to dark mode');
      }
    },

    showFormErrors: function (errors) {
      var n = document.getElementById('error-name');
      var a = document.getElementById('error-amount');
      var c = document.getElementById('error-category');
      if (n) n.textContent = errors.name     || '';
      if (a) a.textContent = errors.amount   || '';
      if (c) c.textContent = errors.category || '';
    },
    clearFormErrors: function () { this.showFormErrors({}); },

    showCategoryError: function (msg) {
      var el = document.getElementById('error-category-name');
      if (el) el.textContent = msg || '';
    },
    clearCategoryError: function () { this.showCategoryError(''); },

    showDeleteCategoryError: function (cat, msg) {
      var el = document.getElementById('error-delete-' + (cat || '').replace(/\s+/g, '-').toLowerCase());
      if (el) el.textContent = msg || '';
    },

    showCategoryDialog: function () {
      var backdrop = document.getElementById('category-dialog-backdrop');
      var input    = document.getElementById('new-category');
      if (backdrop) backdrop.hidden = false;
      if (input)    { input.value = ''; input.focus(); }
      Renderer.clearCategoryError();
    },

    hideCategoryDialog: function () {
      var backdrop = document.getElementById('category-dialog-backdrop');
      if (backdrop) backdrop.hidden = true;
      Renderer.clearCategoryError();
      // Restore the category select to the first real category
      var select = document.getElementById('category');
      if (select && select.options.length > 0) {
        select.selectedIndex = 0;
      }
    },

    showLimitError: function (cat, msg) {
      var el = document.getElementById('error-limit-' + (cat || '').replace(/\s+/g, '-').toLowerCase());
      if (el) el.textContent = msg || '';
    },
    clearLimitError: function (cat) { this.showLimitError(cat, ''); }
  };

  // ---------------------------------------------------------------------------
  // EventHandlers
  // ---------------------------------------------------------------------------
  var EventHandlers = {
    onTransactionSubmit: function (e) {
      e.preventDefault();
      Renderer.clearFormErrors();

      var nameInput     = document.getElementById('item-name');
      var amountInput   = document.getElementById('amount');
      var categoryInput = document.getElementById('category');

      var name     = nameInput     ? nameInput.value.trim()   : '';
      var amount   = amountInput   ? amountInput.value        : '';
      var category = categoryInput ? categoryInput.value      : '';

      var result = Validation.validateTransaction({ name: name, amount: Number(amount), category: category });
      if (!result.valid) {
        Renderer.showFormErrors(result.errors);
        return;
      }

      var id;
      try { id = crypto.randomUUID(); }
      catch (err) { id = Date.now().toString(36) + Math.random().toString(36).slice(2); }

      var tx = {
        id: id,
        name: name,
        amount: Number(amount),
        category: category,
        timestamp: new Date().toISOString()
      };

      State.addTransaction(tx);
      Storage.save(KEYS.TRANSACTIONS, State.transactions);
      App.render();

      if (nameInput)   nameInput.value = '';
      if (amountInput) amountInput.value = '';
      if (nameInput)   nameInput.focus();
    },

    onDeleteTransaction: function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-id]') : null;
      if (!btn || !btn.classList.contains('btn-delete')) return;
      var id = btn.getAttribute('data-id');
      if (!id) return;
      State.deleteTransaction(id);
      Storage.save(KEYS.TRANSACTIONS, State.transactions);
      App.render();
    },

    onAddCategory: function (e) {
      if (e) e.preventDefault();
      Renderer.clearCategoryError();
      var input = document.getElementById('new-category');
      var name  = input ? input.value.trim() : '';

      var result = Validation.validateCategoryName(name, State.categories);
      if (!result.valid) {
        Renderer.showCategoryError(result.error);
        return;
      }

      State.addCategory(name);
      Storage.save(KEYS.CATEGORIES, State.categories);
      Renderer.hideCategoryDialog();
      App.render();
      // Auto-select the newly added category
      var select = document.getElementById('category');
      if (select) select.value = name;
    },

    onCategorySelectChange: function () {
      var select = document.getElementById('category');
      if (!select) return;
      if (select.value === '__add_category__') {
        Renderer.showCategoryDialog();
      }
    },

    onDeleteCategory: function (cat) {
      if (!cat || State.categories.indexOf(cat) === -1) return;

      var usedByTransaction = State.transactions.some(function (tx) {
        return tx.category === cat;
      });

      if (usedByTransaction) {
        Renderer.showDeleteCategoryError(
          cat,
          'Cannot delete: this category is used by existing transactions.'
        );
        return;
      }

      if (!window.confirm('Delete category "' + cat + '"?')) return;

      State.deleteCategory(cat);
      Storage.save(KEYS.CATEGORIES, State.categories);
      Storage.save(KEYS.LIMITS, State.limits);
      App.render();
    },

    onSetLimit: function (cat) {
      Renderer.clearLimitError(cat);
      var slug  = cat.replace(/\s+/g, '-').toLowerCase();
      var input = document.getElementById('limit-input-' + slug);
      var value = input ? input.value : '';

      var result = Validation.validateSpendingLimit(value);
      if (!result.valid) {
        Renderer.showLimitError(cat, result.error);
        return;
      }

      State.setLimit(cat, Number(value));
      Storage.save(KEYS.LIMITS, State.limits);
      App.render();
    },

    onThemeToggle: function () {
      var next = State.theme === 'light' ? 'dark' : 'light';
      State.setTheme(next);
      Storage.save(KEYS.THEME, next);
      Renderer.applyTheme(next);
    },

    onShowSummary: function () {},
    onHideSummary: function () {}
  };

  // ---------------------------------------------------------------------------
  // App — bootstrap and full re-render
  // ---------------------------------------------------------------------------
  var App = {
    init: function () {
      // Hydrate state from storage
      State.init({
        transactions: Storage.load(KEYS.TRANSACTIONS, []),
        categories:   Storage.load(KEYS.CATEGORIES,   []),
        limits:       Storage.load(KEYS.LIMITS,        {}),
        theme:        Storage.load(KEYS.THEME,         'light')
      });

      // Apply saved theme
      Renderer.applyTheme(State.theme);

      // Init chart
      ChartManager.init('spending-chart');

      // Attach event listeners (once)
      var form = document.getElementById('transaction-form');
      if (form) form.addEventListener('submit', EventHandlers.onTransactionSubmit);

      var txList = document.getElementById('transaction-list');
      if (txList) txList.addEventListener('click', EventHandlers.onDeleteTransaction);

      // Category select — intercept "＋ Add category…" option
      var categorySelect = document.getElementById('category');
      if (categorySelect) categorySelect.addEventListener('change', EventHandlers.onCategorySelectChange);

      // Dialog buttons
      var addCatBtn = document.getElementById('add-category-btn');
      if (addCatBtn) addCatBtn.addEventListener('click', EventHandlers.onAddCategory);

      var dialogCancelBtn = document.getElementById('dialog-cancel-btn');
      if (dialogCancelBtn) dialogCancelBtn.addEventListener('click', Renderer.hideCategoryDialog.bind(Renderer));

      var dialogCloseBtn = document.getElementById('dialog-close-btn');
      if (dialogCloseBtn) dialogCloseBtn.addEventListener('click', Renderer.hideCategoryDialog.bind(Renderer));

      // Close dialog on backdrop click
      var backdrop = document.getElementById('category-dialog-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', function (e) {
          if (e.target === backdrop) Renderer.hideCategoryDialog();
        });
      }

      // Close dialog on Escape key
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') Renderer.hideCategoryDialog();
      });

      // Also allow Enter key inside dialog input
      var newCatInput = document.getElementById('new-category');
      if (newCatInput) {
        newCatInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); EventHandlers.onAddCategory(null); }
        });
      }

      var themeBtn = document.getElementById('theme-toggle');
      if (themeBtn) themeBtn.addEventListener('click', EventHandlers.onThemeToggle);

      // Delegate spending-limit and category-management button clicks
      var limitsList = document.getElementById('limits-list');
      if (limitsList) {
        limitsList.addEventListener('click', function (e) {
          var btn = e.target.closest ? e.target.closest('button[data-category]') : null;
          if (!btn) return;

          var cat = btn.getAttribute('data-category');
          if (btn.classList.contains('btn-set-limit')) {
            EventHandlers.onSetLimit(cat);
          } else if (btn.classList.contains('btn-delete-category')) {
            EventHandlers.onDeleteCategory(cat);
          }
        });
      }

      // Initial render
      App.render();
    },

    render: function () {
      Renderer.renderBalance(State.transactions);
      Renderer.renderTransactionList(State.transactions, State.limits);
      Renderer.renderCategorySelector(State.categories);
      Renderer.renderSpendingLimitControls(State.categories, State.limits, State.transactions);
      Renderer.renderChart(State.transactions, State.categories);
      Renderer.renderMonthlySummary(State.transactions);
    }
  };

  // ---------------------------------------------------------------------------
  // Safety nets
  // ---------------------------------------------------------------------------

  // CDN failure guard — if Chart.js didn't load after window load, show message
  window.addEventListener('load', function () {
    if (typeof Chart === 'undefined') {
      var emptyEl = document.getElementById('chart-empty');
      if (emptyEl) {
        emptyEl.textContent = 'Chart unavailable — Chart.js failed to load.';
        emptyEl.hidden = false;
      }
      var canvas = document.getElementById('spending-chart');
      if (canvas) canvas.hidden = true;
    }
  });

  // Global error handler — log unexpected errors without crashing
  window.onerror = function (msg, src, line, col, err) {
    console.error('App error:', msg, src, line, col, err);
    return false; // let browser also log it
  };

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init.bind(App));
  } else {
    App.init();
  }

})();