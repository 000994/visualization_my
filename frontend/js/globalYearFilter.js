/* Global year filter — Independent/Global toggle + bidirectional sync.
   In Global mode, changing any chart's year selector syncs the others.
   Linked selectors: mapYearSelect, calendarYearSelect, sankeyYearSelector */
var _globalFilter = (function() {
  var mode = "independent";
  var linkedSelectorIds = ["mapYearSelect", "calendarYearSelect"];

  var wrapperEl = null;
  var switchEl = null;
  var knobEl = null;
  var labelEl = null;
  var loadingTimer = null;
  var _isSyncing = false;
  var _eventsBound = false;

  function createUI() {
    if (document.getElementById("globalFilterWrapper")) {
      wrapperEl = document.getElementById("globalFilterWrapper");
      switchEl = document.getElementById("globalFilterToggle");
      knobEl = document.getElementById("globalFilterKnob");
      labelEl = document.getElementById("globalFilterToggleLabel");
      return;
    }

    wrapperEl = document.createElement("div");
    wrapperEl.className = "header__global-filter";
    wrapperEl.id = "globalFilterWrapper";
    wrapperEl.style.cssText =
      "display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:auto;margin-right:6px;";

    var toggleContainer = document.createElement("div");
    toggleContainer.className = "global-filter__toggle";
    toggleContainer.style.cssText =
      "display:flex;align-items:center;gap:4px;cursor:pointer;user-select:none;";

    labelEl = document.createElement("span");
    labelEl.id = "globalFilterToggleLabel";
    labelEl.textContent = "Independent";
    labelEl.style.cssText =
      "font-size:.6rem;color:var(--text-muted,#999);font-weight:600;letter-spacing:0;text-transform:uppercase;white-space:nowrap;";

    switchEl = document.createElement("div");
    switchEl.id = "globalFilterToggle";
    switchEl.style.cssText =
      "width:32px;height:18px;border-radius:10px;background:var(--border,#d0d0e0);cursor:pointer;position:relative;transition:background .25s;flex-shrink:0;";

    knobEl = document.createElement("div");
    knobEl.id = "globalFilterKnob";
    knobEl.style.cssText =
      "width:14px;height:14px;border-radius:50%;background:var(--bg-panel,#fff);position:absolute;top:2px;left:2px;transition:left .25s,background .25s;box-shadow:0 1px 3px rgba(0,0,0,.2);";

    switchEl.appendChild(knobEl);
    toggleContainer.appendChild(labelEl);
    toggleContainer.appendChild(switchEl);
    wrapperEl.appendChild(toggleContainer);

    var header = document.querySelector(".header");
    var themeBtn = document.getElementById("themeToggle");
    if (header && themeBtn) {
      header.insertBefore(wrapperEl, themeBtn);
    } else if (document.querySelector(".header__stats")) {
      document.querySelector(".header__stats").after(wrapperEl);
    }
  }

  function getLinkedSelectors() {
    var selectors = linkedSelectorIds
      .map(function(id) { return document.getElementById(id); })
      .filter(Boolean);
    var sankey = document.getElementById("sankeyYearSelector");
    if (sankey) selectors.push(sankey);
    return selectors;
  }

  function syncSelectorsToYear(year, sourceId) {
    if (_isSyncing) return;
    _isSyncing = true;
    var syncedAny = false;
    getLinkedSelectors().forEach(function(select) {
      if (select.id === sourceId) return;
      if (select.value === year) return;
      var opts = Array.prototype.slice.call(select.options).map(function(o) { return o.value; });
      if (opts.indexOf(year) === -1) return;
      select.value = year;
      syncedAny = true;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    _isSyncing = false;
    return syncedAny;
  }

  function showPulse() {
    if (!wrapperEl) return;
    wrapperEl.style.opacity = "0.6";
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(function() {
      if (wrapperEl) wrapperEl.style.opacity = "1";
    }, 350);
  }

  function renderMode() {
    var isGlobal = mode === "global";
    if (labelEl) labelEl.textContent = isGlobal ? "Global" : "Independent";
    if (knobEl) {
      knobEl.style.left = isGlobal ? "16px" : "2px";
      knobEl.style.background = isGlobal ? "var(--accent,#3366cc)" : "var(--bg-panel,#fff)";
    }
    if (switchEl) {
      switchEl.style.background = isGlobal ? "var(--accent-light,#5b8def)" : "var(--border,#d0d0e0)";
    }
  }

  function setMode(nextMode) {
    mode = nextMode === "global" ? "global" : "independent";
    renderMode();
  }

  function handleDocumentChange(e) {
    if (_isSyncing) return;
    if (mode !== "global") return;
    if (!e.target) return;
    var id = e.target.id;
    var allIds = ["mapYearSelect", "calendarYearSelect", "sankeyYearSelector"];
    if (allIds.indexOf(id) === -1) return;
    showPulse();
    syncSelectorsToYear(e.target.value, id);
    // 显式触发 RegionState 年份更新，确保右侧面板（雷达图/24h/弧长图）联动；
    // 即使 mapYearSelect 值未变化（sync 跳过写入选框），RegionState 仍被通知。
    if (window.RegionState) {
      window.RegionState.setYear(e.target.value, "global-filter");
    }
  }

  function bindEvents() {
    var toggleContainer = wrapperEl ? wrapperEl.querySelector(".global-filter__toggle") : null;
    if (toggleContainer && !toggleContainer.dataset.globalModeBound) {
      toggleContainer.dataset.globalModeBound = "true";
      toggleContainer.addEventListener("click", function() {
        setMode(mode === "global" ? "independent" : "global");
      });
    }

    if (!_eventsBound) {
      _eventsBound = true;
      document.addEventListener("change", handleDocumentChange);
    }
  }

  function init() {
    createUI();
    bindEvents();
    renderMode();
  }

  window.globalYearFilter = {
    init: init,
    getMode: function() { return mode; },
    setMode: setMode
  };

  return window.globalYearFilter;
})();
