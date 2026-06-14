/* ============================================================
   polarArcChart.js — 「城势流变」同比变化量双向面积图
   架构：init-once + update 模式
   数据：将 Urban/Rural 年度总数转为同比变化量（当年 - 上年）
   横轴 → 2006-2015 年份（变化量从第二年开始）
   纵轴 → 以 0 为中心的对称区间，Urban 蓝色波峰 / Rural 红色波谷
   ============================================================ */

var _polarChart      = null;
var _polarResizeOff  = null;

// ---- 主题感知颜色 ----
function _polarUrbanColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#5b8def" : "#3366cc";
}
function _polarRuralColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#ffab91" : "#e53935";
}
function _polarUrbanArea() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "rgba(91,141,239,0.6)" : "rgba(51,102,204,0.6)";
}
function _polarRuralArea() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "rgba(255,171,145,0.6)" : "rgba(229,57,53,0.6)";
}
function _polarLabelColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#8899bb" : "#5a5a7a";
}
function _polarTooltipBg() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "rgba(28,36,56,0.96)" : "rgba(255,255,255,0.96)";
}
function _polarTooltipBorder() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#5b8def" : "#3366cc";
}
function _polarTooltipText() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#e4ecf2" : "#1a1a2e";
}
function _polarSplitLineColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "rgba(42,53,80,0.25)" : "rgba(200,200,220,0.20)";
}
function _polarAxisColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "rgba(42,53,80,0.15)" : "rgba(200,200,220,0.15)";
}

// ============================================================
//  initPolarArcChart
// ============================================================
function initPolarArcChart() {
  var dom = document.getElementById("chartArc");
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _polarChart = existing; return existing; }

  _polarChart = echarts.init(dom, CURRENT_THEME);

  // 绑定 resize（仅一次）
  if (!_polarResizeOff) {
    var handler = function() { try { if (_polarChart) _polarChart.resize(); } catch(e) {} };
    window.addEventListener("resize", handler);
    _polarResizeOff = function() { window.removeEventListener("resize", handler); };
  }

  return _polarChart;
}

// ============================================================
//  updatePolarArcChart — 接收 arc_flow 数据 [{year, urban, rural, ...}]
//  内部转换为同比变化量
// ============================================================
function updatePolarArcChart(chartData) {
  if (!_polarChart) initPolarArcChart();
  if (!_polarChart) return null;

  var dom = document.getElementById("chartArc");
  if (!chartData || chartData.length < 2) {
    if (dom) dom.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted,#999);font-size:.8rem">No data</div>';
    return null;
  }

  // ——————————————————————————————————————————————
  //  1. 提取原始数据
  // ——————————————————————————————————————————————
  var rawYears  = chartData.map(function(d) { return String(d.year); });
  var rawUrban  = chartData.map(function(d) { return d.urban  || 0; });
  var rawRural  = chartData.map(function(d) { return d.rural  || 0; });

  // ——————————————————————————————————————————————
  //  2. 计算同比变化量（当年 - 上年）
  //     从第二项开始，第一项没有上年数据
  // ——————————————————————————————————————————————
  var years      = [];
  var urbanRawDelta = [];
  var ruralRawDelta = [];

  for (var i = 1; i < rawYears.length; i++) {
    years.push(rawYears[i]);
    urbanRawDelta.push(rawUrban[i] - rawUrban[i - 1]);
    ruralRawDelta.push(rawRural[i] - rawRural[i - 1]);
  }

  var urbanDelta = urbanRawDelta;
  var ruralDelta = ruralRawDelta;

  // ——————————————————————————————————————————————
  //  4. 确定 Y 轴对称范围
  // ——————————————————————————————————————————————
  var allDeltas = urbanDelta.concat(ruralDelta);
  var absMax = 1;
  allDeltas.forEach(function(v) {
    var a = Math.abs(v);
    if (a > absMax) absMax = a;
  });

  // 向上取整到 1000 的倍数，确保刻度整洁
  var niceMax = Math.ceil(absMax / 1000) * 1000;
  if (niceMax < absMax) niceMax += 1000;



  var urbanSeriesData = urbanDelta.map(function(v) { return v; });
  var ruralSeriesData = ruralDelta.map(function(v) { return v; });

  _polarChart.setOption({
    // ---- 标题 ----
    title: {
      text: "Urban / Rural YoY Change",
      left: "center",
      top: 2,
      textStyle: {
        fontSize: 10,
        fontWeight: "bold",
        color: _polarLabelColor(),
      },
    },

    // ---- 图例 ----
    legend: {
      data: [
        { name: "Urban", icon: "circle" },
        { name: "Rural", icon: "circle" },
      ],
      top: 16,
      left: "center",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 9, color: _polarLabelColor() },
    },

    // ---- Tooltip ----
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: _polarTooltipBg(),
      borderColor: _polarTooltipBorder(),
      textStyle: { color: _polarTooltipText(), fontSize: 11 },
      formatter: function(params) {
        if (!params || !params.length) return "";
        var idx = params[0].dataIndex;
        var year = years[idx] || "?";
        var urban = urbanDelta[idx] || 0;
        var rural = ruralDelta[idx] || 0;
        var uSign = urban >= 0 ? "+" : "";
        var rSign = rural >= 0 ? "+" : "";
        return (
          "<strong>" + year + " YoY Change</strong><br/>" +
          '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + _polarUrbanColor() + ';margin-right:4px"></span> Urban: <strong>' + uSign + fmt(urban) + '</strong><br/>' +
          '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + _polarRuralColor() + ';margin-right:4px"></span> Rural: <strong>' + rSign + fmt(rural) + '</strong>'
        );
      },
      extraCssText: "border-radius:6px;",
    },

    // ---- Grid ----
    grid: {
      left: 50,
      right: 18,            // ★ 增大右侧留白，防止 2015 标签被裁切
      top: 42,
      bottom: 20,           // ★ 增大底部留白，确保年份文字完整显示
    },

    // ---- 横轴（年份） ----
    xAxis: {
      type: "category",
      data: years,
      boundaryGap: false,
      axisLine: {
        show: true,
        lineStyle: { color: _polarAxisColor(), width: 1 },
      },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 9,
        color: _polarLabelColor(),
        fontWeight: "500",
        margin: 4,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: _polarSplitLineColor(),
          type: "dashed",
          width: 1,
        },
      },
    },

    // ---- 纵轴（变化量，以 0 为中心对称） ----
    yAxis: {
      type: "value",
      min: -niceMax,
      max: niceMax,
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 8,
        color: _polarLabelColor(),
        formatter: function(v) {
          if (v === 0) return "0";
          var s = v >= 0 ? "+" : "";
          if (Math.abs(v) >= 1000) return s + (Math.abs(v) / 1000).toFixed(0) + "k";
          return s + v;
        },
      },
      splitLine: {
        show: false,
      },
    },

    // ---- 系列 ----
    series: [
      // ── 基准水平线（y=0） ──
      {
        type: "line",
        data: years.map(function() { return 0; }),
        smooth: true,
        showSymbol: false,
        lineStyle: {
          color: _polarAxisColor(),
          width: 1,
          type: "solid",
        },
        z: 1,
        silent: true,
        tooltip: { show: false },
      },

      // ── Urban（蓝色） ──
      {
        name: "Urban",
        type: "line",
        data: urbanSeriesData,
        smooth: true,
        symbol: "none",
        showSymbol: false,
        lineStyle: {
          width: 2,
          color: _polarUrbanColor(),
        },
        areaStyle: {
          color: _polarUrbanArea(),
        },
        itemStyle: {
          color: _polarUrbanColor(),
        },
        z: 3,
        emphasis: {
          focus: "series",
          lineStyle: { width: 3 },
        },
      },

      // ── Rural（红色，波谷区域填充到 y=0） ──
      {
        name: "Rural",
        type: "line",
        data: ruralSeriesData,
        smooth: true,
        symbol: "none",
        showSymbol: false,
        lineStyle: {
          width: 2,
          color: _polarRuralColor(),
        },
        areaStyle: {
          color: _polarRuralArea(),
        },
        itemStyle: {
          color: _polarRuralColor(),
        },
        z: 2,
        emphasis: {
          focus: "series",
          lineStyle: { width: 3 },
        },
      },
    ],

    animationDuration: 800,
    animationEasing: "cubicOut",
  }, true);

  return _polarChart;
}

// ============================================================
//  disposePolarArcChart
// ============================================================
function disposePolarArcChart() {
  if (_polarChart) {
    try { _polarChart.dispose(); } catch(e) {}
    _polarChart = null;
  }
  if (_polarResizeOff) {
    try { _polarResizeOff(); } catch(e) {}
    _polarResizeOff = null;
  }
}

// ============================================================
//  resizePolarArcChart
// ============================================================
function resizePolarArcChart() {
  try { if (_polarChart) _polarChart.resize(); } catch(e) {}
}

// ---- 兼容旧引用 ----
function renderArcTimeChart(chartData) {
  initPolarArcChart();
  return updatePolarArcChart(chartData);
}

console.log("[polarArc] Module loaded — YoY change bidirectional area chart");
