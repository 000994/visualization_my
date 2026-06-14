/* Detail views for the right-side region-linked charts. */

var detailCharts = [];

function initChartDom(elemId) {
  var dom = document.getElementById(elemId);
  if (!dom) return null;
  var instance = echarts.getInstanceByDom(dom);
  if (instance) return instance;
  return echarts.init(dom);
}

function disposeDetailCharts() {
  detailCharts.forEach(function(c) {
    try { c.dispose(); } catch(e) {}
  });
  detailCharts = [];
}

function _detailTitlePrefix(data) {
  var year = data.year && data.year !== "all" ? data.year : "All Years";
  return (data.region || "All UK") + " / " + year;
}

function _axisK(v) {
  if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(0) + "k";
  return v;
}

function _shortLabel(text, n) {
  text = String(text || "");
  return text.length > n ? text.slice(0, n - 1) + "." : text;
}

function _sumRows(rows) {
  return (rows || []).reduce(function(sum, d) { return sum + (Number(d.count) || 0); }, 0);
}

function renderRegionRadarDetail(data) {
  disposeDetailCharts();
  var d = detailCharts;
  data = data || {};

  var severity = data.severity || [];
  var roadType = (data.roadType || []).slice(0, 7);
  var light = data.light || [];

  var c1 = initChartDom("detailChart1");
  if (c1 && severity.length) {
    var sevColors = {
      Fatal: "#C85D4D",
      Serious: "#F0B79A",
      Slight: "#FAE7D9",
    };
    c1.setOption({
      title: { text: _detailTitlePrefix(data) + " - Severity", left: 10, top: 4, textStyle: { fontSize: 11, color: "#5a5a7a" } },
      legend: { orient: "vertical", right: 8, top: 32, itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 9 } },
      tooltip: { trigger: "item", formatter: function(p) {
        return tooltipHTML(p.name, [
          { label: "Accidents", value: fmt(p.value), color: p.color },
          { label: "Share", value: p.percent.toFixed(1) + "%" },
        ]);
      }},
      series: [{
        type: "pie",
        radius: ["42%", "65%"],
        center: ["36%", "58%"],
        label: { fontSize: 8 },
        itemStyle: { borderRadius: 3, borderColor: "transparent", borderWidth: 2 },
        data: severity.map(function(r) {
          return { name: r.severity_label, value: r.count, itemStyle: { color: sevColors[r.severity_label] || PALETTE.accent } };
        }),
      }],
    });
    d.push(c1);
  }

  var c2 = initChartDom("detailChart2");
  if (c2 && roadType.length) {
    c2.setOption({
      title: { text: "Road Type Contribution", left: 10, top: 4, textStyle: { fontSize: 11, color: "#5a5a7a" } },
      grid: { top: 30, right: 54, bottom: 8, left: 112 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: function(p) {
        return tooltipHTML(p[0].name, [{ label: "Accidents", value: fmt(p[0].value) }]);
      }},
      xAxis: { type: "value", axisLabel: { fontSize: 8, formatter: _axisK }, splitLine: { lineStyle: { type: "dashed", color: "#f0f0f6" } } },
      yAxis: { type: "category", inverse: true, data: roadType.map(function(r) { return _shortLabel(r.road_label, 18); }), axisLabel: { fontSize: 9 }, axisTick: { show: false }, axisLine: { show: false } },
      series: [{
        type: "bar",
        barMaxWidth: 13,
        label: { show: true, position: "right", fontSize: 8, formatter: function(p) { return _axisK(p.value); } },
        data: roadType.map(function(r, i) {
          var roadColors = ["#C85D4D", "#F0B79A", "#FAE7D9", "#E3EEEF", "#AECDD7", "#619DB8"];
          return { value: r.count, itemStyle: { color: roadColors[i % roadColors.length], borderRadius: [0, 4, 4, 0] } };
        }),
      }],
    });
    d.push(c2);
  }

  var c3 = initChartDom("detailChart3");
  if (c3 && light.length) {
    var lightColors = ["#C85D4D", "#F0B79A", "#FAE7D9", "#E3EEEF", "#AECDD7"];
    c3.setOption({
      title: { text: "Light Conditions", left: 10, top: 4, textStyle: { fontSize: 11, color: "#5a5a7a" } },
      grid: { top: 32, right: 12, bottom: 24, left: 44 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "category", data: light.map(function(r) { return _shortLabel(r.light_label, 10); }), axisLabel: { fontSize: 7, rotate: 18 }, axisTick: { show: false } },
      yAxis: { type: "value", axisLabel: { fontSize: 8, formatter: _axisK }, splitLine: { lineStyle: { type: "dashed", color: "#f0f0f6" } } },
      series: [{ type: "bar", barMaxWidth: 22, data: light.map(function(r, i) {
        return { value: r.count, itemStyle: { color: lightColors[i % lightColors.length], borderRadius: [3, 3, 0, 0] } };
      }) }],
    });
    d.push(c3);
  }
}

function renderRegionHourlyDetail(data) {
  disposeDetailCharts();
  var d = detailCharts;
  data = data || {};

  var hourly = (data.hourly || []).slice().sort(function(a, b) { return a.hour - b.hour; });
  var values = hourly.map(function(r) { return r.count || 0; });
  var maxVal = Math.max.apply(null, values.concat([1]));
  var peak = hourly.reduce(function(best, r) { return !best || r.count > best.count ? r : best; }, null);

  var c1 = initChartDom("detailChart1");
  if (c1 && hourly.length) {
    c1.setOption({
      title: { text: _detailTitlePrefix(data) + " - Hourly Profile", left: 10, top: 4, textStyle: { fontSize: 11, color: "#5a5a7a" } },
      grid: { top: 32, right: 12, bottom: 24, left: 44 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "category", data: hourly.map(function(r) { return String(Math.round(r.hour)).padStart(2, "0"); }), axisLabel: { fontSize: 8, interval: 1 }, axisTick: { show: false } },
      yAxis: { type: "value", axisLabel: { fontSize: 8, formatter: _axisK }, splitLine: { lineStyle: { type: "dashed", color: "#f0f0f6" } } },
      series: [{
        type: "bar",
        barMaxWidth: 12,
        markPoint: peak ? { symbolSize: 36, data: [{ name: "Peak", xAxis: String(Math.round(peak.hour)).padStart(2, "0"), yAxis: peak.count }] } : undefined,
        data: hourly.map(function(r) {
          var ratio = (r.count || 0) / maxVal;
          var color = ratio >= .8 ? PALETTE.hourlyPeak : ratio >= .55 ? PALETTE.hourlyHigh : ratio >= .25 ? PALETTE.hourlyNormal : PALETTE.hourlyLow;
          return { value: r.count, itemStyle: { color: color, borderRadius: [2, 2, 0, 0] } };
        }),
      }],
    });
    d.push(c1);
  }

  var buckets = [
    { name: "Night", from: 0, to: 5, count: 0, color: "#C85D4D" },
    { name: "Morning", from: 6, to: 11, count: 0, color: "#F0B79A" },
    { name: "Afternoon", from: 12, to: 17, count: 0, color: "#FAE7D9" },
    { name: "Evening", from: 18, to: 23, count: 0, color: "#E3EEEF" },
  ];
  hourly.forEach(function(r) {
    buckets.forEach(function(b) {
      if (r.hour >= b.from && r.hour <= b.to) b.count += r.count || 0;
    });
  });

  var c2 = initChartDom("detailChart2");
  if (c2) {
    c2.setOption({
      title: { text: "Daypart Split", left: 10, top: 4, textStyle: { fontSize: 11, color: "#5a5a7a" } },
      tooltip: { trigger: "item", formatter: function(p) { return tooltipHTML(p.name, [{ label: "Accidents", value: fmt(p.value) }, { label: "Share", value: p.percent.toFixed(1) + "%" }]); } },
      legend: { orient: "vertical", right: 8, top: 30, itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 9 } },
      series: [{ type: "pie", radius: ["42%", "64%"], center: ["36%", "58%"], label: { fontSize: 8 }, data: buckets.map(function(b) {
        return { name: b.name, value: b.count, itemStyle: { color: b.color } };
      }) }],
    });
    d.push(c2);
  }

  var c3 = initChartDom("detailChart3");
  if (c3 && data.severity && data.severity.length) {
    var sevColors = {
      Fatal: "#C85D4D",
      Serious: "#F0B79A",
      Slight: "#FAE7D9",
    };
    c3.setOption({
      title: { text: "Severity Context", left: 10, top: 4, textStyle: { fontSize: 11, color: "#5a5a7a" } },
      grid: { top: 32, right: 44, bottom: 16, left: 58 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "value", axisLabel: { fontSize: 8, formatter: _axisK }, splitLine: { lineStyle: { type: "dashed", color: "#f0f0f6" } } },
      yAxis: { type: "category", data: data.severity.map(function(r) { return r.severity_label; }), inverse: true, axisTick: { show: false }, axisLine: { show: false } },
      series: [{ type: "bar", barMaxWidth: 18, label: { show: true, position: "right", fontSize: 8, formatter: function(p) { return _axisK(p.value); } }, data: data.severity.map(function(r) {
        return { value: r.count, itemStyle: { color: sevColors[r.severity_label] || PALETTE.accent, borderRadius: [0, 4, 4, 0] } };
      }) }],
    });
    d.push(c3);
  }
}

function renderRegionArcDetail(data) {
  disposeDetailCharts();
  var d = detailCharts;
  data = data || {};

  var flow = (data.arcFlow || []).slice().sort(function(a, b) { return a.year - b.year; });
  var years = flow.map(function(r) { return String(r.year); });
  var urban = flow.map(function(r) { return r.urban || 0; });
  var rural = flow.map(function(r) { return r.rural || 0; });
  var total = flow.map(function(r) { return (r.urban || 0) + (r.rural || 0); });

  var c1 = initChartDom("detailChart1");
  if (c1 && flow.length) {
    c1.setOption({
      title: { text: (data.region || "All UK") + " - Urban/Rural Trend", left: 10, top: 4, textStyle: { fontSize: 11, color: "#5a5a7a" } },
      legend: { top: 24, right: 8, itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 9 } },
      grid: { top: 48, right: 12, bottom: 22, left: 46 },
      tooltip: { trigger: "axis" },
      xAxis: { type: "category", data: years, axisLabel: { fontSize: 8, rotate: 25 }, axisTick: { show: false } },
      yAxis: { type: "value", axisLabel: { fontSize: 8, formatter: _axisK }, splitLine: { lineStyle: { type: "dashed", color: "#f0f0f6" } } },
      series: [
        { name: "Urban", type: "line", smooth: .3, symbol: "none", data: urban, lineStyle: { color: "#AECDD7", width: 2 }, areaStyle: { color: "rgba(174,205,215,.12)" } },
        { name: "Rural", type: "line", smooth: .3, symbol: "none", data: rural, lineStyle: { color: "#F0B79A", width: 2 }, areaStyle: { color: "rgba(240,183,154,.12)" } },
      ],
    });
    d.push(c1);
  }

  var deltas = [];
  for (var i = 1; i < total.length; i++) {
    deltas.push({ year: years[i], value: total[i] - total[i - 1] });
  }
  var c2 = initChartDom("detailChart2");
  if (c2 && deltas.length) {
    c2.setOption({
      title: { text: "Total YoY Change", left: 10, top: 4, textStyle: { fontSize: 11, color: "#5a5a7a" } },
      grid: { top: 32, right: 12, bottom: 24, left: 48 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "category", data: deltas.map(function(r) { return r.year; }), axisLabel: { fontSize: 8, rotate: 25 }, axisTick: { show: false } },
      yAxis: { type: "value", axisLabel: { fontSize: 8, formatter: _axisK }, splitLine: { lineStyle: { type: "dashed", color: "#f0f0f6" } } },
      series: [{ type: "bar", barMaxWidth: 18, data: deltas.map(function(r) {
        return { value: r.value, itemStyle: { color: r.value >= 0 ? "#C85D4D" : "#619DB8", borderRadius: [3, 3, 0, 0] } };
      }) }],
    });
    d.push(c2);
  }

  var c3 = initChartDom("detailChart3");
  if (c3 && data.urbanRural && data.urbanRural.length) {
    var totalUR = _sumRows(data.urbanRural);
    c3.setOption({
      title: { text: "Selected-Year Area Split", left: 10, top: 4, textStyle: { fontSize: 11, color: "#5a5a7a" } },
      tooltip: { trigger: "item", formatter: function(p) { return tooltipHTML(p.name, [{ label: "Accidents", value: fmt(p.value) }, { label: "Share", value: p.percent.toFixed(1) + "%" }]); } },
      graphic: { type: "text", left: "36%", top: "54%", style: { text: _axisK(totalUR), textAlign: "center", fill: "#5a5a7a", fontSize: 13, fontWeight: 700 } },
      legend: { orient: "vertical", right: 8, top: 30, itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 9 } },
      series: [{ type: "pie", radius: ["44%", "66%"], center: ["36%", "58%"], label: { fontSize: 8 }, data: data.urbanRural.map(function(r) {
        var color = r.urban_rural_label === "Urban" ? "#AECDD7" : r.urban_rural_label === "Rural" ? "#F0B79A" : "#78909c";
        return { name: r.urban_rural_label, value: r.count, itemStyle: { color: color } };
      }) }],
    });
    d.push(c3);
  }
}
