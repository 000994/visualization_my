/* 24-hour accident distribution bar chart. */

var _hourlyChart = null;
var _hourlyMaxC = 0;
var _hourlyTotalC = 0;

var _hourlyStaticOption = {
  animationDuration: 600,
  animationEasing: "cubicOut",
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
  },
  grid: { top: 22, right: 10, bottom: 28, left: 40 },
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

function _hourlyBarColor(v) {
  var r = _hourlyMaxC > 0 ? v / _hourlyMaxC : 0;
  if (r >= 0.8) return PALETTE.hourlyPeak;
  if (r >= 0.55) return PALETTE.hourlyHigh;
  if (r >= 0.25) return PALETTE.hourlyNormal;
  return PALETTE.hourlyLow;
}

function _hourlyDaypart(hour) {
  if (hour <= 5) return "Night";
  if (hour <= 11) return "Morning";
  if (hour <= 17) return "Afternoon";
  return "Evening";
}

function _hourlySeverityValue(row, key) {
  return Number(row && row[key]) || 0;
}

function _hourlyPeakRow(rows) {
  return rows.reduce(function(best, row) {
    return !best || row.count > best.count ? row : best;
  }, null);
}

function initHourlyChart() {
  var dom = document.getElementById("chartHourly");
  if (!dom) return null;

  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _hourlyChart = existing; return existing; }

  _hourlyChart = echarts.init(dom, CURRENT_THEME);
  _hourlyChart.setOption(_hourlyStaticOption);
  return _hourlyChart;
}

function updateHourlyChart(data) {
  if (!_hourlyChart) initHourlyChart();
  if (!_hourlyChart || !data) return null;

  var sorted = data.slice().sort(function(a, b) { return a.hour - b.hour; });
  var hours = sorted.map(function(d) { return String(Math.round(d.hour)).padStart(2, "0") + ":00"; });
  var counts = sorted.map(function(d) { return Number(d.count) || 0; });
  var rowsByLabel = {};

  sorted.forEach(function(row) {
    rowsByLabel[String(Math.round(row.hour)).padStart(2, "0") + ":00"] = row;
  });

  _hourlyMaxC = Math.max.apply(null, counts.concat([0]));
  _hourlyTotalC = counts.reduce(function(sum, v) { return sum + v; }, 0);

  var avg = sorted.length ? _hourlyTotalC / sorted.length : 0;
  var peak = _hourlyPeakRow(sorted);

  _hourlyChart.setOption({
    tooltip: {
      formatter: function(p) {
        if (!p || !p.length) return "";
        var row = rowsByLabel[p[0].axisValue] || {};
        var count = Number(p[0].value) || 0;
        var share = _hourlyTotalC ? (count / _hourlyTotalC * 100).toFixed(1) + "%" : "0%";
        var hour = Number(row.hour);
        if (isNaN(hour)) hour = parseInt(p[0].axisValue, 10) || 0;

        return tooltipHTML(p[0].axisValue, [
          { label: "Accidents", value: fmt(count), color: _hourlyBarColor(count) },
          { label: "Share of total", value: share },
          { label: "Daypart", value: _hourlyDaypart(hour) },
          { label: "Fatal", value: fmt(_hourlySeverityValue(row, "fatal")), color: "#C85D4D" },
          { label: "Serious", value: fmt(_hourlySeverityValue(row, "serious")), color: "#F0B79A" },
          { label: "Slight", value: fmt(_hourlySeverityValue(row, "slight")), color: "#FAE7D9" },
        ]);
      },
    },
    xAxis: { data: hours },
    series: [{
      data: sorted.map(function(row) {
        var v = Number(row.count) || 0;
        return {
          value: v,
          itemStyle: { color: _hourlyBarColor(v), borderRadius: [3, 3, 0, 0] },
        };
      }),
      markArea: {
        silent: true,
        label: { color: "rgba(90,90,122,.52)", fontSize: 9, fontWeight: 700 },
        data: [
          [
            { name: "Night", xAxis: "00:00", itemStyle: { color: "rgba(97,157,184,.08)" } },
            { xAxis: "05:00" },
          ],
          [
            { name: "Morning", xAxis: "06:00", itemStyle: { color: "rgba(174,205,215,.10)" } },
            { xAxis: "11:00" },
          ],
          [
            { name: "Afternoon", xAxis: "12:00", itemStyle: { color: "rgba(250,231,217,.18)" } },
            { xAxis: "17:00" },
          ],
          [
            { name: "Evening", xAxis: "18:00", itemStyle: { color: "rgba(200,93,77,.07)" } },
            { xAxis: "23:00" },
          ],
        ],
      },
      markLine: {
        silent: true,
        symbol: "none",
        lineStyle: { color: "rgba(90,90,122,.55)", type: "dashed", width: 1.2 },
        label: {
          formatter: "Average accidents per hour",
          color: "#5a5a7a",
          fontSize: 9,
          position: "insideEndTop",
        },
        data: [{ yAxis: avg }],
      },
      markPoint: peak ? {
        symbol: "pin",
        symbolSize: 46,
        itemStyle: { color: "#5b70d6" },
        label: {
          formatter: "Peak " + String(Math.round(peak.hour)).padStart(2, "0") + ":00",
          color: "#fff",
          fontSize: 9,
          fontWeight: 700,
        },
        data: [{
          name: "Peak",
          xAxis: String(Math.round(peak.hour)).padStart(2, "0") + ":00",
          yAxis: peak.count,
        }],
      } : undefined,
    }],
  });

  return _hourlyChart;
}

function disposeHourlyChart() {
  if (_hourlyChart) {
    try { _hourlyChart.dispose(); } catch(e) {}
    _hourlyChart = null;
  }
}

function renderHourlyBar(data) {
  initHourlyChart();
  return updateHourlyChart(data);
}
