/* ============================================================
   calendarChart.js — 月×周 热力图
   架构：init-once + update 模式
   指标：Total / Fatal / Casualties（内建切换按钮）
   年份：从日历面板独立选择器读取
   ============================================================ */

var _calendarChart         = null;
var _calendarData          = null;     // 当前全量 calendar 数据
var _calMetricIdx          = 0;
var _calendarControlsInited = false;

var _calMetrics = [
  { key: "total",      label: "Total Accidents" },
  { key: "fatal",      label: "Fatal Accidents" },
  { key: "casualties", label: "Casualties Count" },
];
var _calMonths     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var _calWeekLabels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

// ============================================================
//  initCalendarChart
// ============================================================
function initCalendarChart() {
  var dom = document.getElementById("chartCalendar");
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _calendarChart = existing; return existing; }

  _calendarChart = echarts.init(dom, CURRENT_THEME);

  // ★ 指标按钮只创建一次
  if (!_calendarControlsInited) _initCalendarControls();

  return _calendarChart;
}

// ============================================================
//  指标按钮组（仅创建一次）
// ============================================================
function _initCalendarControls() {
  _calendarControlsInited = true;
  var container = document.getElementById("chartCalendar");
  if (!container) return;

  // 移除旧按钮组（如果有）
  var oldGroup = container.querySelector(".calendar__metric-group");
  if (oldGroup) oldGroup.remove();

  var btnGroup = document.createElement("div");
  btnGroup.className = "calendar__metric-group";
  btnGroup.style.cssText =
    "position:absolute;top:4px;right:90px;z-index:10;" +
    "display:flex;gap:2px;" +
    "background:rgba(255,255,255,.75);backdrop-filter:blur(4px);" +
    "border-radius:6px;padding:2px 4px;box-shadow:0 1px 4px rgba(0,0,0,.08);";

  var labels = ["Total", "Fatal", "Casualties"];
  labels.forEach(function(label, idx) {
    var btn = document.createElement("button");
    btn.className = "calendar__metric-btn";
    btn.textContent = label;
    var isActive = idx === _calMetricIdx;
    btn.style.cssText =
      "padding:2px 8px;font-size:9px;font-weight:600;border:none;border-radius:4px;" +
      "cursor:pointer;background:" + (isActive ? "#3366cc" : "transparent") + ";" +
      "color:" + (isActive ? "#fff" : "#888") + ";transition:all .2s;";
    btn.addEventListener("click", function() {
      _calMetricIdx = idx;
      btnGroup.querySelectorAll("button").forEach(function(b, i) {
        b.style.background = i === idx ? "#3366cc" : "transparent";
        b.style.color      = i === idx ? "#fff" : "#888";
      });
      _applyCalendarData();
    });
    btnGroup.appendChild(btn);
  });
  container.appendChild(btnGroup);
}

// ============================================================
//  获取当前选中年份
// ============================================================
function _getCalendarYear() {
  if (typeof window._calendarSelectedYear === "number") return window._calendarSelectedYear;
  var sel = document.getElementById("calendarYearSelect");
  if (!sel) return (new Date()).getFullYear();
  return parseInt(sel.value);
}

// ============================================================
//  内部：应用当前 metric + year 渲染
// ============================================================
function _applyCalendarData() {
  if (!_calendarChart || !_calendarData) return;

  var metricKey  = _calMetrics[_calMetricIdx].key;
  var selectedYear = _getCalendarYear();

  var rawTotal      = _calendarData.total || [];
  var rawFatal      = _calendarData.fatal || [];
  var rawCasualties = _calendarData.casualties || [];

  // 过滤选中年份
  var yearTotal      = rawTotal.filter(function(d) { return d.year === selectedYear; });
  var yearFatal      = rawFatal.filter(function(d) { return d.year === selectedYear; });
  var yearCasualties = rawCasualties.filter(function(d) { return d.year === selectedYear; });

  // 查找映射
  function k(d) { return d.month + "_" + d.week_of_month; }
  var mapTotal = {}, mapFatal = {}, mapCasualties = {};
  yearTotal.forEach(function(d)      { mapTotal[d.month + "_" + d.week_of_month]      = d.count; });
  yearFatal.forEach(function(d)      { mapFatal[d.month + "_" + d.week_of_month]      = d.count; });
  yearCasualties.forEach(function(d) { mapCasualties[d.month + "_" + d.week_of_month] = d.count; });

  // 构建 heatmap [monthIdx, weekIdx, value]
  var heatData = [];
  var maxVal = 0;
  for (var m = 0; m < 12; m++) {
    for (var w = 0; w < 5; w++) {
      var key = (m + 1) + "_" + (w + 1);
      var val = mapTotal[key] || 0;
      if (val > maxVal) maxVal = val;
      heatData.push([m, w, val]);
    }
  }

  var colors = ["#619DB8","#AECDD7","#E3EEEF","#FAE7D9","#F0B79A","#C85D4D"];

  _calendarChart.setOption({
    animationDuration: 400,
    animationEasing: "cubicOut",
    title: {
      text: selectedYear + " — " + _calMetrics[_calMetricIdx].label,
      left: "center", top: 55,           // ★ 容器内部保护区：标题下沉到安全距离（避开上方 stat-badge）
      textStyle: { fontSize: 11, fontWeight: "bold", color: "#3366cc" },
    },
    tooltip: {
      trigger: "item",
      formatter: function(p) {
        if (!p.data || p.data.length < 3) return "";
        var mi = p.data[0], wi = p.data[1];
        var monthLabel = _calMonths[mi];
        var weekNum = wi + 1;
        var t = mapTotal[(mi+1)+"_"+weekNum] || 0;
        var f = mapFatal[(mi+1)+"_"+weekNum] || 0;
        var c = mapCasualties[(mi+1)+"_"+weekNum] || 0;
        function fmt(v) { return v >= 10000 ? (v/1000).toFixed(1)+"k" : v; }
        return "<strong>" + selectedYear + " " + monthLabel + " - Week " + weekNum + "</strong><br>" +
               "Total: <strong>" + fmt(t) + "</strong><br>" +
               "Fatal: <strong>" + fmt(f) + "</strong><br>" +
               "Casualties: <strong>" + fmt(c) + "</strong>";
      },
    },
    grid: { top: 80, bottom: 6, left: 44, right: 70 },    // ★ 热力网格整体下移 80px，顶部留保护区
    xAxis: { type: "category", data: _calMonths, splitArea: { show: true }, axisLabel: { fontSize: 9, interval: 0 }, axisTick: { show: false } },
    yAxis: { type: "category", data: _calWeekLabels, splitArea: { show: true }, axisLabel: { fontSize: 9 }, axisTick: { show: false } },
    visualMap: {
      min: 0, max: maxVal || 1,
      calculable: true, orient: "vertical", right: 8, top: 80, bottom: 6,  // ★ 与 grid 同步下移
      inRange: { color: colors },
      textStyle: { fontSize: 8 },
      formatter: function(v) {
        if (v >= 10000) return (v/1000).toFixed(0) + "k";
        if (v >= 1000)  return (v/1000).toFixed(1) + "k";
        return v;
      },
    },
    series: [{
      type: "heatmap",
      data: heatData,
      label: {
        show: true, fontSize: 8, color: "#444",
        formatter: function(p) {
          if (!p.data || p.data.length < 3) return "";
          var v = p.data[2];
          if (v === 0) return "";
          if (v >= 10000) return (v/1000).toFixed(0) + "k";
          if (v >= 1000)  return (v/1000).toFixed(1) + "k";
          return v;
        },
      },
      emphasis: {
        itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.25)", borderColor: "#fff", borderWidth: 2 },
      },
    }],
  });
}

// ============================================================
//  updateCalendarChart
// ============================================================
function updateCalendarChart(calendarData) {
  if (!_calendarChart) initCalendarChart();
  if (!calendarData) return null;
  _calendarData = calendarData;
  _applyCalendarData();
  return _calendarChart;
}

// ============================================================
//  disposeCalendarChart
// ============================================================
function disposeCalendarChart() {
  if (_calendarChart) {
    try { _calendarChart.dispose(); } catch(e) {}
    _calendarChart = null;
  }
}

// ---- 兼容旧 API ----
function renderCalendarChart(calendarData) {
  initCalendarChart();
  return updateCalendarChart(calendarData);
}
