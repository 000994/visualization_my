/* ============================================================
   hourlyBarChart.js — 24小时事故分布柱状图
   架构：init-once + update 模式
     - initHourlyChart()  → 页面生命周期仅执行一次
     - updateHourlyChart(data) → 数据变更时调用，setOption 增量更新
     - disposeHourlyChart() → 主题切换时调用，销毁再重建
   热力着色：红(高峰) → 橙 → 蓝 → 灰(低峰)
   ============================================================ */

var _hourlyChart = null;       // 缓存实例
var _hourlyMaxC  = 0;          // 缓存当前数据最大值（用于着色归一化）

// ---- 静态配置（不随数据变化） ----
var _hourlyStaticOption = {
  animationDuration: 600,
  animationEasing: "cubicOut",
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    // formatter 在 init 中动态绑定（需要访问实时数据）
  },
  grid: { top: 6, right: 10, bottom: 28, left: 40 },
  xAxis: {
    type: "category",
    axisLabel: { fontSize: 8, rotate: 45, interval: 2 },
    axisTick: { show: false },
  },
  yAxis: {
    type: "value",
    axisLabel: { fontSize: 9, formatter: function(v) { return (v / 1000).toFixed(0) + "k"; } },
    splitLine: { lineStyle: { type: "dashed" } },
  },
  series: [{
    type: "bar",
    barMaxWidth: 16,
    emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,.2)" } },
  }],
};

// ---- 柱体颜色（基于归一化比率） ----
function _hourlyBarColor(v) {
  var r = _hourlyMaxC > 0 ? v / _hourlyMaxC : 0;
  if (r >= 0.8)  return PALETTE.hourlyPeak;        // red
  if (r >= 0.55) return PALETTE.hourlyHigh;        // orange
  if (r >= 0.25) return PALETTE.hourlyNormal;      // blue
  return PALETTE.hourlyLow;                         // gray
}

// ============================================================
//  initHourlyChart — 页面生命周期仅执行一次
// ============================================================
function initHourlyChart() {
  var dom = document.getElementById("chartHourly");
  if (!dom) return null;

  // 如果已有实例（非主题切换的情况），直接返回
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _hourlyChart = existing; return existing; }

  _hourlyChart = echarts.init(dom, CURRENT_THEME);
  // 绑定静态骨架配置
  _hourlyChart.setOption(_hourlyStaticOption);
  return _hourlyChart;
}

// ============================================================
//  updateHourlyChart — 增量注入数据（setOption merge）
// ============================================================
function updateHourlyChart(data) {
  if (!_hourlyChart) initHourlyChart();
  if (!_hourlyChart || !data) return null;

  var sorted = data.slice().sort(function(a, b) { return a.hour - b.hour; });
  var hours  = sorted.map(function(d) { return String(Math.round(d.hour)).padStart(2, "0") + ":00"; });
  var counts = sorted.map(function(d) { return d.count; });
  _hourlyMaxC = Math.max.apply(null, counts);

  _hourlyChart.setOption({
    tooltip: {
      formatter: function(p) {
        if (!p || !p.length) return "";
        return tooltipHTML(p[0].axisValue, [
          { label: "Accidents", value: fmt(p[0].value), color: _hourlyBarColor(p[0].value) },
        ]);
      },
    },
    xAxis: { data: hours },
    series: [{
      data: counts.map(function(v) {
        return { value: v, itemStyle: { color: _hourlyBarColor(v), borderRadius: [3, 3, 0, 0] } };
      }),
    }],
  });

  return _hourlyChart;
}

// ============================================================
//  disposeHourlyChart — 主题切换时销毁实例
// ============================================================
function disposeHourlyChart() {
  if (_hourlyChart) {
    try { _hourlyChart.dispose(); } catch(e) {}
    _hourlyChart = null;
  }
}

// ============================================================
//  兼容旧 API（main.js 调用）
// ============================================================
function renderHourlyBar(data) {
  initHourlyChart();
  return updateHourlyChart(data);
}
