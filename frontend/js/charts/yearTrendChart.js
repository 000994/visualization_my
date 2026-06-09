/* ============================================================
   yearTrendChart.js — 年度事故趋势折线图（左上）
   ============================================================ */
function renderYearTrend(data) {
  const chart = initChart("chartYearly");
  if (!chart) return null;

  const years  = data.map(d => d.year);
  const counts = data.map(d => d.count);

  chart.setOption({
    animationDuration: 600,
    animationEasing: "cubicOut",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      formatter: p => tooltipHTML(`Year ${p[0].axisValue}`, [
        { label: "Accidents", value: fmt(p[0].value), color: PALETTE.accent },
      ]),
    },
    grid: { top: 8, right: 16, bottom: 24, left: 44 },
    xAxis: {
      type: "category", data: years,
      axisLabel: { fontSize: 10, rotate: 30 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 10, formatter: v => (v / 1000).toFixed(0) + "k" },
      splitLine: { lineStyle: { type: "dashed" } },
    },
    series: [{
      type: "line", data: counts, smooth: 0.35,
      symbol: "circle", symbolSize: 5,
      lineStyle: { color: PALETTE.accent, width: 2.5 },
      itemStyle: { color: PALETTE.accent },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(51,102,204,.22)" },
          { offset: 1, color: "rgba(51,102,204,.02)" },
        ]),
      },
      emphasis: { scale: 1.5 },
    }],
  });
  return chart;
}
