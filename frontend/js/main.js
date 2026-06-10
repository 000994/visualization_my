/* ============================================================
   main.js — 应用入口（重构版 v3：init-once + update 模式）
   职责：
     1. 加载数据 → 2. init 所有图表（只一次）
     3. update 注入数据 → 4. 主题切换 dispose 后重新 init+update
   Leaflet 地图在切换主题时保持存活，仅调整 TileLayer URL
   ============================================================ */

// ---- 全局 ----
var gData        = {};    // global_charts_data.json
var gMapYearly   = {};    // map_yearly_data.json
var gSankeyData  = {};    // sankey_data.json（Light→Severity→Vehicle）
var gArcFlowData = {};    // arc_flow_data.json（Urban/Rural×Severity graph）
var gMap         = null;  // 地图实例（renderMapChart 返回值）

// ---- 数据加载 ----
async function loadJSON(path) {
  var r = await fetch(path);
  if (!r.ok) throw new Error("HTTP " + r.status + ": " + path);
  return r.json();
}

async function loadAllData() {
  var results = await Promise.all([
    loadJSON("data/global_charts_data.json"),
    loadJSON("data/map_yearly_data.json"),
    loadJSON("data/sankey_data.json"),
    loadJSON("data/arc_flow_data.json"),
  ]);
  gData       = results[0];
  gMapYearly  = results[1];
  gSankeyData = results[2];
  gArcFlowData = results[3];

  console.log("[main] Data loaded — " +
    (gData.meta ? gData.meta.total_accidents.toLocaleString() : "?") + " accidents");

  // 注入统计指标卡片数据
  if (typeof setStatData === "function" && gData.meta) {
    var m = gData.meta;
    setStatData({
      total:      m.total_accidents  || 0,
      fatal:      m.fatal_count      || 0,
      casualties: m.total_casualties || 0,
      peakHour:   m.peak_hour        || "--",
    });
  }

  // 注入下钻详情面板数据（独立小 JSON + gData 中的 district）
  if (typeof setDetailData === "function") {
    var detailPaths = ["vehicle_type_distribution", "hourly_distribution", "severity_distribution",
                       "daily_distribution", "urban_rural_distribution", "yearly_severity_trend",
                       "light_conditions_distribution", "road_type_distribution"];
    try {
      var detailResults = await Promise.all(detailPaths.map(function(p) {
        return loadJSON("data/" + p + ".json");
      }));
      setDetailData({
        vehicle:       detailResults[0],
        hourly:        detailResults[1],
        severity:      detailResults[2],
        daily:         detailResults[3],
        urbanRural:    detailResults[4],
        yearlySeverity: detailResults[5],
        lightCond:     detailResults[6],
        roadType:      detailResults[7],
        district:      gData.district_top10,  // ★ 修复第 3 子图表空白
      });
    } catch(e) {
      console.warn("[main] Detail data load failed (non-critical):", e.message);
    }
  }
}

// ============================================================
//  第一阶段：初始化所有图表实例（只执行一次，initChartOnce）
// ============================================================
function initAllCharts() {
  // 每个模块的 init*Chart 内部使用 initChartOnce，重复调用安全
    if (typeof initSankeyChart     === "function") initSankeyChart();
  if (typeof initHourlyChart     === "function") initHourlyChart();
  if (typeof initCalendarChart   === "function") initCalendarChart();
  if (typeof initPolarArcChart   === "function") initPolarArcChart();
  if (typeof initSeverityChart   === "function") initSeverityChart();
  if (typeof initRadarChart      === "function") initRadarChart();
  if (typeof initDistrictChart   === "function") initDistrictChart();
  console.log("[main] All chart instances initialized");
}

// ============================================================
//  第二阶段：注入全量数据（update*Chart，内部调用 setOption）
// ============================================================
function updateAllCharts() {
  if (gSankeyData)           updateSankeyChart(gSankeyData);
  if (gData.hourly)          updateHourlyChart(gData.hourly);
  if (gData.calendar)        updateCalendarChart(gData.calendar);
  if (gData.arc_flow)            updatePolarArcChart(gData.arc_flow);
  if (gData.severity)        updateSeverityChart(gData.severity);
  if (gData.radar)           updateRadarChart(gData.radar);
  if (gData.district_top10)  updateDistrictChart(gData.district_top10);
  console.log("[main] All charts updated with data");
}

// ============================================================
//  第三阶段：销毁所有图表（仅主题切换时调用）
// ============================================================
function disposeAllCharts() {
    if (typeof disposeSankeyChart     === "function") disposeSankeyChart();
  if (typeof disposeHourlyChart     === "function") disposeHourlyChart();
  if (typeof disposeCalendarChart   === "function") disposeCalendarChart();
  if (typeof disposePolarArcChart   === "function") disposePolarArcChart();
  if (typeof disposeSeverityChart   === "function") disposeSeverityChart();
  if (typeof disposeRadarChart      === "function") disposeRadarChart();
  if (typeof disposeDistrictChart   === "function") disposeDistrictChart();
  if (typeof disposeDetailCharts    === "function") disposeDetailCharts();
  console.log("[main] All chart instances disposed");
}

// ============================================================
//  获取当前所有存活的图表实例（供 resize 使用）
// ============================================================
function _collectLiveInstances() {
  var instances = [];
  var chartIds = ["chartSankey", "chartHourly", "chartCalendar", "chartArc", "chartSeverity", "chartRadar", "chartDistrict"];
  chartIds.forEach(function(id) {
    var dom = document.getElementById(id);
    if (dom) {
      var inst = echarts.getInstanceByDom(dom);
      if (inst) instances.push(inst);
    }
  });
  // 隐藏 tab 中的图表（当前 display:none）也收集，echarts 存活的 instance 都在
  // 详情面板图表
  ["detailChart1","detailChart2","detailChart3"].forEach(function(id) {
    var dom = document.getElementById(id);
    if (dom) {
      var inst = echarts.getInstanceByDom(dom);
      if (inst) instances.push(inst);
    }
  });
  return instances;
}

// ---- 渲染地图 ----
async function renderMap(data) {
  data = data || {};
  gMap = await renderMapChart({
    districtData: data.district_all || null,
    points:       data.points        || null,
  });
  if (gMap) console.log("[main] Map rendered");
}

// ---- 地图年份切换（增量） ----
function onMapYearChange(year) {
  var yearData = gMapYearly[year];
  if (!yearData) { console.warn("[main] No map data for year:", year); return; }
  // ★ 附加年份标签，供 mapChart 显示
  yearData._yearLabel = year === "all" ? "All Years" : year;
  // ★ 调用 mapChart.js 的 switchMapYear（已通过 window 暴露）
  if (typeof window._mapSwitchYear === "function") {
    window._mapSwitchYear(yearData);
  } else if (typeof window.switchMapYear === "function") {
    // mapChart.js 的原始函数
    window.switchMapYear(yearData);
  }
}

// ★ 暴露给 HTML 内联调用
window.onMapYearChange = onMapYearChange;

// ============================================================
//  首次加载入口
// ============================================================
async function init() {
  try {
    await loadAllData();

    // ★ 初始化全局年份筛选器（在图表初始化之后，确保所有独立选择器已创建）
    if (typeof window.globalYearFilter !== "undefined") {
      // 稍后执行，等各图表 init 创建完独立选择器
      setTimeout(function() { window.globalYearFilter.init(); }, 100);
    }

    // ★ 步骤 1：初始化所有图表实例（仅一次）
    initAllCharts();

    // ★ 步骤 2：注入数据
    updateAllCharts();

    // ★ 步骤 3：渲染地图
    await renderMap(gMapYearly["all"] || {});

    console.log("[main] Init complete — all charts live with init-once pattern");
  } catch (err) {
    console.error("[main] Init failed:", err);
    var el = document.getElementById("chartMap");
    if (el) el.innerHTML = "<div style=\"padding:40px;text-align:center;color:#e53935\"><h3>Data Loading Failed</h3><p>" + err.message + "</p><p style=\"font-size:.8rem;color:#999\">Run: python preprocess.py</p></div>";
  }
}

document.addEventListener("DOMContentLoaded", init);

// ============================================================
//  resize — 批量 resize 所有存活实例
// ============================================================
function resizeAll() {
  _collectLiveInstances().forEach(function(c) {
    try { c.resize(); } catch(_) {}
  });
  if (gMap) { try { gMap.resize(); } catch(_) {} }
}
var _resizeTimer = null;
window.addEventListener("resize", function() {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(resizeAll, 150);
});

// ============================================================
//  ★ 主题切换 —— dispose 全部旧实例 → 用新主题重新 init + update
//     Leaflet 地图保持存活，仅更换 TileLayer URL
// ============================================================
window.addEventListener("themeChanged", function() {
  // 1) 销毁所有 ECharts 实例（它们绑定了旧主题，必须重建）
  disposeAllCharts();

  // 2) 用新主题重新 init + 重新注入数据
  initAllCharts();
  updateAllCharts();

  // 3) Leaflet 地图：仅更换瓦片 URL（不销毁实例，无闪烁）
  if (window._leafletMap) {
    try {
      // 移除旧瓦片层
      if (window._mapTileLayer && window._leafletMap.hasLayer(window._mapTileLayer)) {
        window._leafletMap.removeLayer(window._mapTileLayer);
      }
      // 暗色主题使用 CARTO dark 瓦片，亮色使用标准 OSM
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      var tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      var tileAttribution = isDark
        ? "&copy; <a href='https://www.openstreetmap.org/copyright'>OSM</a> &copy; <a href='https://carto.com/'>CARTO</a>"
        : "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>";
      window._mapTileLayer = L.tileLayer(tileUrl, {
        attribution: tileAttribution,
        maxZoom: 18, maxNativeZoom: 18, noWrap: true,
      }).addTo(window._leafletMap);
      window._leafletMap.invalidateSize();
    } catch(e) { console.warn("[main] Tile swap failed:", e.message); }
  }

  console.log("[main] Theme changed — charts rebuilt, map tiles swapped");
});

// ============================================================
//  事件监听：地图 / 日历年份选择器
// ============================================================
document.addEventListener("change", function(e) {
  if (e.target && e.target.id === "mapYearSelect") {
    onMapYearChange(e.target.value);
  }
  if (e.target && e.target.id === "calendarYearSelect") {
    window._calendarSelectedYear = parseInt(e.target.value);
    if (gData.calendar && typeof updateCalendarChart === "function") {
      updateCalendarChart(gData.calendar);
    }
  }
});
window._calendarSelectedYear = 2005;  // ★ 默认首屏显示 2005（数据范围为 2005-2015）

// ============================================================
//  Tab 切换逻辑（统一处理所有 panel 内的选项卡）
// ============================================================
document.addEventListener("click", function(e) {
  var tab = e.target.closest(".panel__tab");
  if (!tab) return;

  var parent = tab.closest(".panel");
  if (!parent) return;

  // 切换 tab 高亮
  parent.querySelectorAll(".panel__tab").forEach(function(t) {
    t.classList.remove("panel__tab--active");
  });
  tab.classList.add("panel__tab--active");

  var target = tab.getAttribute("data-tab");
  if (!target) return;

  // 切换 tab-content 显示
  parent.querySelectorAll(".panel__tab-content").forEach(function(el) {
    el.style.display = "none";
    el.classList.remove("panel__tab-content--active");
  });
  var targetContent = parent.querySelector("#tabContent" + target.charAt(0).toUpperCase() + target.slice(1));
  if (targetContent) {
    targetContent.style.display = "flex";
    targetContent.classList.add("panel__tab-content--active");
    // 触发 chart resize 以适配新尺寸
    setTimeout(function() {
      resizeAll();
    }, 150);
  }
});

// ============================================================
//  ★ 桑基图节点联动事件监听
// ============================================================
window.addEventListener("sankeyNodeSelected", function(e) {
  var detail = e.detail;
  if (!detail) return;

  var nodeName = detail.name;
  var category = detail.category;
  console.log("[linkage] Selected:", nodeName, "(" + category + ")");

  // 1) 联动地图 — 高亮匹配散点
  if (typeof highlightMapPoints === "function") {
    var points = getCurrentMapPoints();
    if (points) {
      highlightMapPoints(points, nodeName, category);
    }
  }

  // 2) 联动 TOP10 — 切换到 district tab + 更新数据
  if (typeof switchToDistrictTab === "function") {
    switchToDistrictTab(nodeName, category);
  }
});

window.addEventListener("sankeyNodeDeselected", function() {
  console.log("[linkage] Node deselected — restoring defaults");

  // 1) 恢复地图散点
  if (typeof clearMapHighlight === "function") {
    clearMapHighlight();
  }

  // 2) 恢复 TOP10 到全局默认
  if (typeof switchToDistrictTab === "function") {
    switchToDistrictTab(null, null);
  }
});

// ★ 获取当前地图散点数据
function getCurrentMapPoints() {
  var mapYearSelect = document.getElementById("mapYearSelect");
  var year = mapYearSelect ? mapYearSelect.value : "all";
  if (gMapYearly && gMapYearly[year]) {
    return gMapYearly[year].points || null;
  }
  return null;
}

// ★ 切换到 District TOP10 Tab
function switchToDistrictTab(nodeName, category) {
  // 点击 district tab 按钮
  var districtTab = document.getElementById("tabDistrict");
  if (!districtTab) return;

  if (nodeName && category) {
    // 触发切换到 district tab
    districtTab.click();

    // 更新 TOP10 数据
    if (window.SankeyLinkage && gData && gData.district_top10) {
      var points = getCurrentMapPoints();
      var filtered = window.SankeyLinkage.getFilteredDistrict(gData.district_top10, points, { name: nodeName, category: category });
      if (filtered && typeof updateDistrictChart === "function") {
        updateDistrictChart(filtered);
      }
    }
  } else {
    // 恢复为全局 district_top10
    // 如果当前 tab 不是 district 则不操作
    if (districtTab.classList.contains("panel__tab--active")) {
      if (gData && gData.district_top10 && typeof updateDistrictChart === "function") {
        updateDistrictChart(gData.district_top10);
      }
    }
  }
}

console.log("[main] Ready (init-once pattern)");
