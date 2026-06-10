/* ============================================================
   globalYearFilter.js — 全局年份筛选器（覆盖层模式）
   在现有独立选择器之上叠加「全局联动」能力
   开启时：全局选择器 → 联动各图表独立选择器 → 触发各图表更新
   关闭时：完全退化为原有独立选择器逻辑，零干扰
   ============================================================ */

var _globalFilter = (function() {

  // ---- 状态 ----
  var _mode = "independent";    // "global" | "independent"
  var _globalYear = "all";      // 全局选择的年份
  var _loadingTimer = null;

  // ---- DOM 引用 ----
  var _selectEl = null;         // 全局年份 <select>
  var _toggleEl = null;         // 模式切换开关
  var _toggleLabel = null;

  // ---- 需要联动的独立选择器 ID 列表 ----
  var _linkedSelectors = [
    "mapYearSelect",          // 英国地图
    "calendarYearSelect",     // 日历热力图
    // 桑基图选择器 #sankeyYearSelector 由 sankeyChart.js 动态创建，需单独处理
  ];

  // ============================================================
  //  创建 UI 元素
  // ============================================================
  function _createUI() {
    // ── 容器 ──
    var wrapper = document.createElement("div");
    wrapper.className = "header__global-filter";
    wrapper.id = "globalFilterWrapper";
    wrapper.style.cssText =
      "display:flex;align-items:center;gap:6px;flex-shrink:0;" +
      "margin-left:auto;margin-right:6px;";

    // ── 模式切换开关（toggle switch） ──
    var toggleContainer = document.createElement("div");
    toggleContainer.className = "global-filter__toggle";
    toggleContainer.style.cssText =
      "display:flex;align-items:center;gap:4px;cursor:pointer;" +
      "user-select:none;";

    var toggleLabel = document.createElement("span");
    toggleLabel.id = "globalFilterToggleLabel";
    toggleLabel.textContent = "独立";
    toggleLabel.style.cssText =
      "font-size:.6rem;color:var(--text-muted,#999);font-weight:600;" +
      "letter-spacing:.3px;text-transform:uppercase;white-space:nowrap;";

    var toggleSwitch = document.createElement("div");
    toggleSwitch.id = "globalFilterToggle";
    toggleSwitch.style.cssText =
      "width:32px;height:18px;border-radius:10px;" +
      "background:var(--border,#d0d0e0);cursor:pointer;" +
      "position:relative;transition:background .25s;flex-shrink:0;";

    var toggleKnob = document.createElement("div");
    toggleKnob.id = "globalFilterKnob";
    toggleKnob.style.cssText =
      "width:14px;height:14px;border-radius:50%;" +
      "background:var(--bg-panel,#fff);position:absolute;" +
      "top:2px;left:2px;transition:left .25s,background .25s;" +
      "box-shadow:0 1px 3px rgba(0,0,0,.2);";

    toggleSwitch.appendChild(toggleKnob);
    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(toggleSwitch);

    // ── 全局年份选择器 ──
    var select = document.createElement("select");
    select.id = "globalYearSelect";
    select.className = "filter-select global-filter__select";
    select.style.cssText =
      "background:var(--bg-panel,#fff);color:var(--text-primary,#333);" +
      "border:1px solid var(--border,#e0e0f0);border-radius:6px;" +
      "padding:4px 24px 4px 8px;font-size:.72rem;font-family:inherit;" +
      "cursor:pointer;appearance:none;max-width:110px;" +
      "background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E\");" +
      "background-repeat:no-repeat;background-position:right 8px center;";

    select.innerHTML =
      '<option value="all">All Years</option>' +
      '<option value="2005">2005</option><option value="2006">2006</option>' +
      '<option value="2007">2007</option><option value="2008">2008</option>' +
      '<option value="2009">2009</option><option value="2010">2010</option>' +
      '<option value="2011">2011</option><option value="2012">2012</option>' +
      '<option value="2013">2013</option><option value="2014">2014</option>' +
      '<option value="2015">2015</option>';

    // 初始状态：全局选择器禁用（独立模式）
    select.disabled = true;
    select.style.opacity = "0.4";
    select.style.pointerEvents = "none";

    wrapper.appendChild(toggleContainer);
    wrapper.appendChild(select);

    // ── 插入到 header 中（统计卡片之后、主题切换之前） ──
    var header = document.querySelector(".header");
    var themeBtn = document.getElementById("themeToggle");
    if (header && themeBtn) {
      header.insertBefore(wrapper, themeBtn);
    } else {
      // fallback
      document.querySelector(".header__stats").after(wrapper);
    }

    _selectEl = select;
    _toggleEl = toggleSwitch;
    _toggleLabel = toggleLabel;
    _toggleKnob = toggleKnob;
  }

  // ============================================================
  //  获取桑基图选择器（动态创建，需查找）
  // ============================================================
  function _getSankeySelector() {
    return document.getElementById("sankeyYearSelector");
  }

  // ============================================================
  //  获取所有需联动的独立选择器（含桑基图动态选择器）
  // ============================================================
  function _getAllLinkedSelectors() {
    var selectors = [];
    _linkedSelectors.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) selectors.push(el);
    });
    var sankeySel = _getSankeySelector();
    if (sankeySel) selectors.push(sankeySel);
    return selectors;
  }

  // ============================================================
  //  设置所有独立选择器的值为指定年份
  // ============================================================
  function _syncSelectorsToYear(year) {
    var selectors = _getAllLinkedSelectors();
    selectors.forEach(function(sel) {
      if (sel.value !== year) {
        sel.value = year;
        // 触发 change 事件，让各图表模块自行更新
        var evt = new Event("change", { bubbles: true });
        sel.dispatchEvent(evt);
      }
    });
  }

  // ============================================================
  //  切换模式
  // ============================================================
  function _setMode(mode) {
    if (mode === _mode) return;
    _mode = mode;

    if (mode === "global") {
      // ── 开启全局联动 ──
      _selectEl.disabled = false;
      _selectEl.style.opacity = "1";
      _selectEl.style.pointerEvents = "auto";
      _toggleLabel.textContent = "全局";
      _toggleKnob.style.left = "16px";
      _toggleKnob.style.background = "var(--accent,#3366cc)";
      toggleSwitch.style.background = "var(--accent-light,#5b8def)";

      // 用当前全局年份同步一次
      _syncSelectorsToYear(_globalYear);

    } else {
      // ── 关闭全局联动（恢复独立模式） ──
      _selectEl.disabled = true;
      _selectEl.style.opacity = "0.4";
      _selectEl.style.pointerEvents = "none";
      _toggleLabel.textContent = "独立";
      _toggleKnob.style.left = "2px";
      _toggleKnob.style.background = "var(--bg-panel,#fff)";
      toggleSwitch.style.background = "var(--border,#d0d0e0)";
    }
  }

  // ============================================================
  //  显示简易加载提示
  // ============================================================
  function _showLoading() {
    var el = document.getElementById("globalFilterWrapper");
    if (!el) return;
    el.style.opacity = "0.6";
    el.style.transition = "opacity .15s";
    clearTimeout(_loadingTimer);
    _loadingTimer = setTimeout(function() {
      if (el) el.style.opacity = "1";
    }, 400);
  }

  // ============================================================
  //  绑定事件
  // ============================================================
  function _bindEvents() {
    // ── 全局年份选择器 ──
    var select = document.getElementById("globalYearSelect");
    if (select) {
      select.addEventListener("change", function() {
        _globalYear = this.value;
        if (_mode === "global") {
          _showLoading();
          _syncSelectorsToYear(_globalYear);
        }
      });
    }

    // ── 模式切换开关 ──
    var toggle = document.getElementById("globalFilterToggle");
    if (toggle) {
      toggle.addEventListener("click", function(e) {
        e.stopPropagation();
        _setMode(_mode === "global" ? "independent" : "global");
      });
    }

    // ── 点击整个切换区域也可触发 ──
    var toggleContainer = document.querySelector(".header__global-filter .global-filter__toggle");
    if (toggleContainer) {
      toggleContainer.addEventListener("click", function(e) {
        // 如果点击的是 toggle 内部但不在 toggle 元素上，转发
        if (e.target.closest("#globalFilterToggle")) return;
        _setMode(_mode === "global" ? "independent" : "global");
      });
    }
  }

  // ============================================================
  //  公共 API
  // ============================================================
  function init() {
    _createUI();
    _bindEvents();
    console.log("[globalYearFilter] Ready — mode: independent");
  }

  function getMode() {
    return _mode;
  }

  function getGlobalYear() {
    return _globalYear;
  }

  function setMode(mode) {
    _setMode(mode);
  }

  // 暴露到全局
  window.globalYearFilter = {
    init: init,
    getMode: getMode,
    getGlobalYear: getGlobalYear,
    setMode: setMode,
  };

  return {
    init: init,
    getMode: getMode,
    getGlobalYear: getGlobalYear,
    setMode: setMode,
  };

})();
