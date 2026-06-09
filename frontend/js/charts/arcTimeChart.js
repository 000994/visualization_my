/* ============================================================
   arcTimeChart.js — 城乡事故时间流变弧长图
   架构：init-once + update 模式
   特点：使用 ECharts custom series renderItem 绘制贝塞尔弧线
   ============================================================ */

var _arcChart      = null;
var _arcResizeOff  = null;    // resize 事件解绑引用

// ---- 静态配置骨架 ----
var _arcStaticOption = {
  tooltip: { trigger: "item", confine: true, extraCssText: "border-radius:6px;" },
  grid:   { left: 15, right: 15, top: 30, bottom: 20 },
  xAxis:  { type: "category", axisTick: { show: false }, axisLabel: { fontSize: 9, interval: 0 }, splitLine: { show: false } },
  yAxis:  { type: "value", show: false, min: -25 - 5, max: 25 + 5, splitLine: { show: false } },
};

// ---- 构建弧线段 ----
function _buildArcSegments(deltas, years, upward) {
  var H = 25;
  var allAbs = deltas.map(function(v) { return Math.abs(v); });
  var maxDelta = Math.max.apply(null, allAbs) || 1;

  var segs = [];
  for (var i = 1; i < deltas.length; i++) {
    var amp = deltas[i];
    if (amp === 0) continue;
    if (upward && amp <= 0) continue;
    if (!upward && amp >= 0) continue;
    var absAmp = Math.abs(amp);
    var norm = (absAmp / maxDelta) * H;
    var dir = upward ? -norm : norm;
    segs.push({
      fromYear: String(years[i - 1]),
      toYear:   String(years[i]),
      amp: amp,
      dir: dir,
      lw: Math.max(1.5, (absAmp / maxDelta) * 5),
    });
  }
  return segs;
}

function _makeArcSeries(segs, color, name) {
  if (!segs.length) return null;
  return {
    name: name,
    type: "custom",
    renderItem: function(params, api) {
      var seg = segs[params.dataIndex];
      if (!seg) return;
      var s = api.coord([seg.fromYear, 0]);
      var e = api.coord([seg.toYear, 0]);
      var cx = (s[0] + e[0]) / 2;
      var cy = s[1] + seg.dir;
      return {
        type: "path",
        shape: {
          pathData: "M" + s[0] + "," + s[1] + " Q" + cx + "," + cy + " " + e[0] + "," + s[1],
          x: -1, y: -1, width: 2, height: 2,
        },
        style: { stroke: color, fill: "none", lineWidth: seg.lw, opacity: 0.9 },
      };
    },
    data: segs.map(function(_, i) { return i; }),
    z: 10,
    tooltip: {
      formatter: function(params) {
        var seg = segs[params.data];
        if (!seg) return "";
        var d = seg.amp >= 0 ? "+" : "";
        return "<strong>" + seg.fromYear + "→" + seg.toYear + "</strong><br>" + name + ": " + d + seg.amp.toLocaleString();
      },
    },
  };
}

// ---- 主题感知颜色 ----
function _arcUrbanColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#5b8def" : "#3366cc";
}
function _arcRuralColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#ef9a9a" : "#e53935";
}
function _arcTextColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#8899bb" : "#666";
}
function _arcBgColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "rgba(28,36,56,0.95)" : "rgba(255,255,255,0.95)";
}
function _arcBorderColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#2a3550" : "#e8e8f0";
}
function _arcTextStyleColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#e4ecf2" : "#1a1a2e";
}
function _arcBaselineColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#3a4a6a" : "#ddd";
}
function _arcAxisLineColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#3a4a6a" : "#ccc";
}

// ============================================================
//  initArcChart
// ============================================================
function initArcChart() {
  var dom = document.getElementById("chartArc");
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _arcChart = existing; return existing; }

  _arcChart = echarts.init(dom, CURRENT_THEME);
  _arcChart.setOption(_arcStaticOption);

  // 绑定 resize（仅一次）
  if (!_arcResizeOff) {
    var handler = function() { try { if (_arcChart) _arcChart.resize(); } catch(e) {} };
    window.addEventListener("resize", handler);
    _arcResizeOff = function() { window.removeEventListener("resize", handler); };
  }

  return _arcChart;
}

// ============================================================
//  updateArcChart
// ============================================================
function updateArcChart(chartData) {
  if (!_arcChart) initArcChart();
  if (!_arcChart) return null;

  var dom = document.getElementById("chartArc");
  if (!chartData || chartData.length < 2) {
    if (dom) dom.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted,#999);font-size:.8rem">No data</div>';
    return null;
  }

  var years = chartData.map(function(d) { return String(d.year); });
  var urbanDeltas = chartData.map(function(d) { return d.urban_delta; });
  var ruralDeltas = chartData.map(function(d) { return d.rural_delta; });

  var uUp = _buildArcSegments(urbanDeltas, years, true);
  var uDn = _buildArcSegments(urbanDeltas, years, false);
  var rUp = _buildArcSegments(ruralDeltas, years, true);
  var rDn = _buildArcSegments(ruralDeltas, years, false);

  var seriesList = [];
  [
    _makeArcSeries(uUp, _arcUrbanColor(), "Urban ↑"),
    _makeArcSeries(uDn, _arcUrbanColor(), "Urban ↓"),
    _makeArcSeries(rUp, _arcRuralColor(), "Rural ↑"),
    _makeArcSeries(rDn, _arcRuralColor(), "Rural ↓"),
  ].forEach(function(s) { if (s) seriesList.push(s); });

  if (!seriesList.length) {
    if (dom) dom.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted,#999);font-size:.8rem">No change data</div>';
    return null;
  }

  _arcChart.setOption({
    tooltip: {
      backgroundColor: _arcBgColor(),
      borderColor: _arcBorderColor(),
      textStyle: { color: _arcTextStyleColor(), fontSize: 11 },
    },
    xAxis: { data: years, axisLine: { lineStyle: { color: _arcAxisLineColor() } }, axisLabel: { color: _arcTextColor() } },
    series: [
      {
        type: "line",
        data: years.map(function() { return 0; }),
        smooth: false,
        showSymbol: false,
        lineStyle: { color: _arcBaselineColor(), width: 1, type: "dashed" },
        z: 1,
        silent: true,
      },
    ].concat(seriesList),
  });

  return _arcChart;
}

// ============================================================
//  disposeArcChart
// ============================================================
function disposeArcChart() {
  if (_arcChart) {
    try { _arcChart.dispose(); } catch(e) {}
    _arcChart = null;
  }
  if (_arcResizeOff) {
    try { _arcResizeOff(); } catch(e) {}
    _arcResizeOff = null;
  }
}

// ---- 兼容旧 API ----
function renderArcTimeChart(chartData) {
  initArcChart();
  return updateArcChart(chartData);
}
