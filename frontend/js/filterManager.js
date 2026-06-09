/* ============================================================
   filterManager.js — 全局筛选器 + 统计指标卡片
   职责：筛选状态管理、事件监听、指标卡片渲染、触发图表刷新
   数据源：meta（aggregated_data.json）+ severity + hourly + yearly
   ============================================================ */

(function () {
  var SELECTORS = ["#filterYear", "#filterRoad", "#filterUrban"];

  /**
   * 获取当前筛选状态
   * @returns {{ year: string, road: string, urban: string }}
   */
  function getFilterState() {
    return {
      year:  document.getElementById("filterYear")  ? document.getElementById("filterYear").value  : "all",
      road:  document.getElementById("filterRoad")  ? document.getElementById("filterRoad").value  : "all",
      urban: document.getElementById("filterUrban") ? document.getElementById("filterUrban").value : "all",
    };
  }

  // 暴露到全局（供 chart 模块读取）
  window.getFilterState = getFilterState;

  // ---- 筛选变更 → 触发全局刷新事件 ----
  SELECTORS.forEach(function (selId) {
    var el = document.getElementById(selId.replace("#", ""));
    if (!el) return;
    el.addEventListener("change", function () {
      var state = getFilterState();
      console.log("[filter] Changed:", JSON.stringify(state));
      // 点击反馈：筛选器闪烁
      el.classList.remove("filter-active");
      void el.offsetWidth; // 触发回流以重播动画
      el.classList.add("filter-active");
      // 派发自定义事件，main.js 监听后重渲所有图表
      window.dispatchEvent(new CustomEvent("filterChanged", { detail: state }));
    });
  });

  // ---- 统计指标卡片渲染 ----
  var statData = null; // { total, fatal, casualties, peakHour }

  function setStatData(data) {
    statData = data;
    renderStatCards();
  }

  function renderStatCards() {
    if (!statData) return;
    setVal("statTotal",    statData.total     ? statData.total.toLocaleString()     : "--");
    setVal("statFatal",    statData.fatal     ? statData.fatal.toLocaleString()      : "--");
    setVal("statCasualty", statData.casualties ? statData.casualties.toLocaleString() : "--");
    setVal("statPeak",     statData.peakHour  ? statData.peakHour                    : "--");
  }

  function setVal(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    var valEl = el.querySelector(".stat-badge__val");
    if (valEl) valEl.textContent = text;
  }

  // 暴露到全局（main.js 注入数据后调用）
  window.setStatData = setStatData;

  // ---- 监听 filterChanged，按年份更新指标卡片 ----
  window.addEventListener("filterChanged", function (e) {
    if (!statData) return;

    var filter = getFilterState();
    var year = filter.year;
    var isAll = filter.year === "all" && filter.road === "all" && filter.urban === "all";

    if (isAll) {
      renderStatCards();
      return;
    }

    // 从 district_all 中统计过滤后的数据
    // 因为 main.js 的 filterData 已经计算，但指标卡片需要额外的数据
    // 简单做法：从页面上现有的小图表数据无法直接获取
    // 这里用 statData.yearlyMap 只支持按年份筛选
    if (year !== "all" && statData.yearlyMap) {
      var yr = statData.yearlyMap[year];
      if (yr !== undefined) {
        setVal("statTotal", yr.toLocaleString());
      }
    }
  });

  console.log("[filterManager] Ready");
})();
