/* ============================================================
   vehicleTypeChart.js — 车辆类型分布水平条形图（右下）
   取 TOP8，其余归入 "Other"
   ============================================================ */
function renderVehicleType(data) {
  const chart = initChart("chartVehicle");
  if (!chart) return null;

  // 取 TOP8 + Other
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top8 = sorted.slice(0, 8);
  const otherCount = sorted.slice(8).reduce((s, d) => s + d.count, 0);
  const items = otherCount > 0
    ? [...top8, { vehicle_label: "Other", count: otherCount }]
    : top8;

  const labels  = items.map(d => d.vehicle_label);
  const counts  = items.map(d => d.count);
  const colors  = pickColors(PALETTE.vehicleColors, items.length);

  chart.setOption({
    animationDuration: 600,
    animationEasing: "cubicOut",
    tooltip: {
      trigger: "axis", axisPointer: { type: "shadow" },
      formatter: p => tooltipHTML(p[0].name, [
        { label: "Vehicles", value: fmt(p[0].value), color: colors[p[0].dataIndex] },
      ]),
    },
    grid: { top: 2, right: 50, bottom: 24, left: 4 },
    xAxis: {
      type: "value",
      axisLabel: { fontSize: 9, formatter: v => (v / 1000000).toFixed(1) + "M" },
      splitLine: { lineStyle: { type: "dashed" } },
    },
    yAxis: {
      type: "category", data: labels, inverse: true,
      axisLabel: { fontSize: 9, width: 90, overflow: "truncate" },
      axisTick: { show: false }, axisLine: { show: false },
    },
    series: [{
      type: "bar",
      data: counts.map((v, i) => ({
        value: v,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colors[i] }, { offset: 1, color: colors[i] + "66" },
          ]),
          borderRadius: [0, 4, 4, 0],
        },
      })),
      barMaxWidth: 14,
      label: { show: true, position: "right", fontSize: 8, formatter: p => fmt(p.value) },
      emphasis: { scale: true, scaleSize: 3 },
    }],
  });
  return chart;
}
