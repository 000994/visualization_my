/* Application entry: data loading, chart lifecycle, and cross-view coordination. */

var gData = {};
var gRegionProfiles = {};
var gSelectedRegion = null;
var gMapYearly = {};
var gSankeyData = {};
var gArcFlowData = {};
var gMap = null;
var gRegionStateBound = false;

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
    loadJSON("data/region_profiles.json"),
  ]);

  gData = results[0] || {};
  gMapYearly = results[1] || {};
  gSankeyData = results[2] || {};
  gArcFlowData = results[3] || {};
  gRegionProfiles = results[4] || {};

  if (typeof setStatData === "function" && gData.meta) {
    var m = gData.meta;
    setStatData({
      total: m.total_accidents || 0,
      fatal: m.fatal_count || 0,
      casualties: m.total_casualties || 0,
      peakHour: m.peak_hour || "--",
    });
  }

  console.log("[main] Data loaded");
}

function initAllCharts() {
  if (typeof initSankeyChart === "function") initSankeyChart();
  if (typeof initHourlyChart === "function") initHourlyChart();
  if (typeof initCalendarChart === "function") initCalendarChart();
  if (typeof initPolarArcChart === "function") initPolarArcChart();
  if (typeof initRadarChart === "function") initRadarChart();
}

function updateAllCharts() {
  if (gSankeyData && typeof updateSankeyChart === "function") updateSankeyChart(gSankeyData);
  if (gData.hourly && typeof updateHourlyChart === "function") updateHourlyChart(gData.hourly);
  if (gData.calendar && typeof updateCalendarChart === "function") updateCalendarChart(gData.calendar);
  if (gData.arc_flow && typeof updatePolarArcChart === "function") updatePolarArcChart(gData.arc_flow);
  if (gData.radar && typeof updateRadarChart === "function") updateRadarChart(gData.radar);
}

function disposeAllCharts() {
  if (typeof disposeSankeyChart === "function") disposeSankeyChart();
  if (typeof disposeHourlyChart === "function") disposeHourlyChart();
  if (typeof disposeCalendarChart === "function") disposeCalendarChart();
  if (typeof disposePolarArcChart === "function") disposePolarArcChart();
  if (typeof disposeRadarChart === "function") disposeRadarChart();
  if (typeof disposeDetailCharts === "function") disposeDetailCharts();
}

function setRightPanelScope(regionName, year) {
  var scope = regionName || "All UK";
  var yearLabel = year && year !== "all" ? year : "All Years";
  var titleMap = {
    panelRadar: "Region Radar - " + scope + " (" + yearLabel + ")",
    panelHourly: "24-Hour Distribution - " + scope + " (" + yearLabel + ")",
    panelArc: "Urban / Rural YoY Change - " + scope,
  };

  Object.keys(titleMap).forEach(function(panelId) {
    var panel = document.getElementById(panelId);
    var title = panel ? panel.querySelector(".panel__title") : null;
    if (title) title.textContent = titleMap[panelId];
  });
}

function updateRegionLinkedCharts(regionName, year) {
  gSelectedRegion = regionName || null;

  if (!regionName) {
    if (gData.hourly) updateHourlyChart(gData.hourly);
    if (gData.radar) updateRadarChart(gData.radar);
    if (gData.arc_flow) updatePolarArcChart(gData.arc_flow);
    setRightPanelScope(null, "all");
    return;
  }

  var profile = gRegionProfiles[regionName];
  if (!profile) {
    console.warn("[region] No profile for:", regionName);
    return;
  }

  var yearKey = year || "all";
  var yearProfile = profile[yearKey] || profile.all;
  var trendProfile = profile.all || yearProfile;

  if (yearProfile.hourly) updateHourlyChart(yearProfile.hourly);
  if (yearProfile.radar) updateRadarChart(yearProfile.radar);
  if (trendProfile.arc_flow) updatePolarArcChart(trendProfile.arc_flow);
  setRightPanelScope(regionName, yearKey);
}

function updateMapStatus(regionName, year) {
  var regionEl = document.getElementById("mapStatusRegion");
  var yearEl = document.getElementById("mapStatusYear");
  var resetBtn = document.getElementById("mapResetBtn");
  var yearLabel = year && year !== "all" ? year : "All Years";

  if (regionEl) regionEl.textContent = regionName || "All UK";
  if (yearEl) yearEl.textContent = yearLabel;
  if (resetBtn) {
    resetBtn.disabled = !regionName;
    resetBtn.style.opacity = regionName ? "1" : ".45";
  }
}

function applyRegionState(state) {
  state = state || {};
  updateRegionLinkedCharts(state.region || null, state.year || "all");
  updateMapStatus(state.region || null, state.year || "all");
}

function bindRegionState() {
  if (gRegionStateBound || !window.RegionState) return;
  gRegionStateBound = true;
  window.RegionState.subscribe(applyRegionState);
}

function objectToRows(obj, labelKey) {
  return Object.keys(obj || {}).map(function(name) {
    var row = { count: obj[name] || 0 };
    row[labelKey] = name;
    return row;
  }).sort(function(a, b) { return b.count - a.count; });
}

function buildAllUkDetailProfile() {
  return {
    hourly: gData.hourly || [],
    radar: gData.radar || {},
    arc_flow: gData.arc_flow || [],
    total: gData.meta ? gData.meta.total_accidents : 0,
  };
}

function getActiveRegionProfile() {
  var state = window.RegionState ? window.RegionState.get() : { region: gSelectedRegion, year: "all" };
  var region = state.region || null;
  var year = state.year || "all";

  if (!region) {
    return {
      region: "All UK",
      year: "all",
      yearProfile: buildAllUkDetailProfile(),
      trendProfile: buildAllUkDetailProfile(),
    };
  }

  var profile = gRegionProfiles[region];
  var yearProfile = profile ? (profile[year] || profile.all) : null;
  var trendProfile = profile ? (profile.all || yearProfile) : null;
  return {
    region: region,
    year: year,
    yearProfile: yearProfile || buildAllUkDetailProfile(),
    trendProfile: trendProfile || buildAllUkDetailProfile(),
  };
}

window.getRegionDetailData = function(chartType) {
  var ctx = getActiveRegionProfile();
  var radar = ctx.yearProfile.radar || {};
  return {
    chartType: chartType,
    region: ctx.region,
    year: ctx.year,
    total: ctx.yearProfile.total || 0,
    trendTotal: ctx.trendProfile.total || 0,
    hourly: ctx.yearProfile.hourly || [],
    arcFlow: ctx.trendProfile.arc_flow || [],
    severity: objectToRows(radar.severity, "severity_label"),
    roadType: objectToRows(radar.road_type, "road_label"),
    urbanRural: objectToRows(radar.urban_rural, "urban_rural_label"),
    light: objectToRows(radar.light, "light_label"),
  };
};

function collectLiveInstances() {
  var instances = [];
  ["chartSankey", "chartHourly", "chartCalendar", "chartArc", "chartRadar", "detailChart1", "detailChart2", "detailChart3"].forEach(function(id) {
    var dom = document.getElementById(id);
    var inst = dom ? echarts.getInstanceByDom(dom) : null;
    if (inst) instances.push(inst);
  });
  return instances;
}

async function renderMap(data) {
  data = data || {};
  gMap = await renderMapChart({
    districtData: data.district_all || null,
    points: data.points || null,
  });
}

function onMapYearChange(year) {
  var yearData = gMapYearly[year];
  if (!yearData) {
    console.warn("[main] No map data for year:", year);
    return;
  }
  yearData._yearLabel = year === "all" ? "All Years" : year;
  if (typeof window.switchMapYear === "function") window.switchMapYear(yearData);
}

window.onMapYearChange = onMapYearChange;

async function init() {
  try {
    await loadAllData();

    initAllCharts();
    updateAllCharts();
    await renderMap(gMapYearly.all || {});
    bindRegionState();

    if (window.globalYearFilter) {
      setTimeout(function() { window.globalYearFilter.init(); }, 100);
    }

    console.log("[main] Init complete");
  } catch (err) {
    console.error("[main] Init failed:", err);
    var el = document.getElementById("chartMap");
    if (el) {
      el.innerHTML = "<div style=\"padding:40px;text-align:center;color:#e53935\"><h3>Data Loading Failed</h3><p>" +
        err.message + "</p><p style=\"font-size:.8rem;color:#999\">Run: python preprocess.py</p></div>";
    }
  }
}

document.addEventListener("DOMContentLoaded", init);

function resizeAll() {
  collectLiveInstances().forEach(function(c) {
    try { c.resize(); } catch(_) {}
  });
  if (gMap) { try { gMap.resize(); } catch(_) {} }
}

var resizeTimer = null;
window.addEventListener("resize", function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resizeAll, 150);
});

window.addEventListener("themeChanged", function() {
  disposeAllCharts();
  initAllCharts();
  updateAllCharts();
  applyRegionState(window.RegionState ? window.RegionState.get() : { region: gSelectedRegion, year: "all" });

  if (window._leafletMap) {
    try {
      if (window._mapTileLayer && window._leafletMap.hasLayer(window._mapTileLayer)) {
        window._leafletMap.removeLayer(window._mapTileLayer);
      }
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      var tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      var tileAttribution = isDark
        ? "&copy; <a href='https://www.openstreetmap.org/copyright'>OSM</a> &copy; <a href='https://carto.com/'>CARTO</a>"
        : "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>";
      window._mapTileLayer = L.tileLayer(tileUrl, {
        attribution: tileAttribution,
        maxZoom: 18,
        maxNativeZoom: 18,
        noWrap: true,
      }).addTo(window._leafletMap);
      window._leafletMap.invalidateSize();
    } catch(e) {
      console.warn("[main] Tile swap failed:", e.message);
    }
  }
});

document.addEventListener("change", function(e) {
  if (e.target && e.target.id === "mapYearSelect") {
    onMapYearChange(e.target.value);
    if (window.RegionState) window.RegionState.setYear(e.target.value, "map-year");
  }

  if (e.target && e.target.id === "calendarYearSelect") {
    window._calendarSelectedYear = parseInt(e.target.value);
    if (gData.calendar && typeof updateCalendarChart === "function") updateCalendarChart(gData.calendar);
  }
});

document.addEventListener("click", function(e) {
  if (e.target && e.target.id === "mapResetBtn") {
    if (typeof window.clearSelectedRegion === "function") {
      window.clearSelectedRegion();
    } else if (window.RegionState) {
      window.RegionState.clearRegion("status-reset");
    }
  }
});

window._calendarSelectedYear = 2005;

window.addEventListener("sankeyNodeSelected", function(e) {
  var detail = e.detail;
  if (!detail || typeof highlightMapPoints !== "function") return;
  var points = getCurrentMapPoints();
  if (points) highlightMapPoints(points, detail.name, detail.category);
});

window.addEventListener("sankeyNodeDeselected", function() {
  if (typeof clearMapHighlight === "function") clearMapHighlight();
});

function getCurrentMapPoints() {
  var mapYearSelect = document.getElementById("mapYearSelect");
  var year = mapYearSelect ? mapYearSelect.value : "all";
  return gMapYearly && gMapYearly[year] ? gMapYearly[year].points || null : null;
}

console.log("[main] Ready");
