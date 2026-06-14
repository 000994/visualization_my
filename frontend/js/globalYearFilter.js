/* Optional global year control for charts that still expose their own year select. */
var _globalFilter = (function() {
  var mode = "independent";
  var globalYear = "all";
  var linkedSelectorIds = ["mapYearSelect", "calendarYearSelect"];

  var wrapperEl = null;
  var selectEl = null;
  var switchEl = null;
  var knobEl = null;
  var labelEl = null;
  var loadingTimer = null;

  function yearsMarkup() {
    var years = ["all", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015"];
    return years.map(function(year) {
      var label = year === "all" ? "All Years" : year;
      return '<option value="' + year + '">' + label + "</option>";
    }).join("");
  }

  function createUI() {
    if (document.getElementById("globalFilterWrapper")) {
      wrapperEl = document.getElementById("globalFilterWrapper");
      selectEl = document.getElementById("globalYearSelect");
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

    selectEl = document.createElement("select");
    selectEl.id = "globalYearSelect";
    selectEl.className = "filter-select global-filter__select";
    selectEl.innerHTML = yearsMarkup();
    selectEl.style.cssText =
      "background:var(--bg-panel,#fff);color:var(--text-primary,#333);border:1px solid var(--border,#e0e0f0);border-radius:6px;padding:4px 24px 4px 8px;font-size:.72rem;font-family:inherit;cursor:pointer;appearance:none;max-width:110px;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 8px center;";

    wrapperEl.appendChild(toggleContainer);
    wrapperEl.appendChild(selectEl);

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

  function syncSelectorsToYear(year) {
    getLinkedSelectors().forEach(function(select) {
      if (select.value === year) return;
      select.value = year;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
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
    if (selectEl) {
      selectEl.disabled = !isGlobal;
      selectEl.style.opacity = isGlobal ? "1" : "0.4";
      selectEl.style.pointerEvents = isGlobal ? "auto" : "none";
    }
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
    if (mode === "global") syncSelectorsToYear(globalYear);
  }

  function bindEvents() {
    if (selectEl && !selectEl.dataset.globalYearBound) {
      selectEl.dataset.globalYearBound = "true";
      selectEl.addEventListener("change", function() {
        globalYear = selectEl.value || "all";
        if (mode === "global") {
          showPulse();
          syncSelectorsToYear(globalYear);
        }
      });
    }

    var toggleContainer = wrapperEl ? wrapperEl.querySelector(".global-filter__toggle") : null;
    if (toggleContainer && !toggleContainer.dataset.globalModeBound) {
      toggleContainer.dataset.globalModeBound = "true";
      toggleContainer.addEventListener("click", function() {
        setMode(mode === "global" ? "independent" : "global");
      });
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
    getGlobalYear: function() { return globalYear; },
    setMode: setMode
  };

  return window.globalYearFilter;
})();
