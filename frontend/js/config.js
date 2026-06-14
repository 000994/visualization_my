/* ============================================================
   config.js — ECharts 双主题注册 + 全局色板 + 工具函数
   所有图表模块依赖此文件。主题: "lightDashboard" / "darkDashboard"
   ============================================================ */

// ==========================================================
// 一、注册 Light 主题
// ==========================================================
echarts.registerTheme("lightDashboard", {
  backgroundColor: "transparent",
  textStyle:       { color: "#5a5a7a" },
  title:           { textStyle: { color: "#1a1a2e" } },
  legend:          { textStyle: { color: "#5a5a7a" } },
  categoryAxis: {
    axisLine:  { lineStyle: { color: "#d0d0e0" } },
    axisTick:  { lineStyle: { color: "#d0d0e0" } },
    axisLabel: { color: "#5a5a7a" },
    splitLine: { lineStyle: { color: "#f0f0f6", type: "dashed" } },
  },
  valueAxis: {
    axisLine:  { lineStyle: { color: "#d0d0e0" } },
    axisTick:  { lineStyle: { color: "#d0d0e0" } },
    axisLabel: { color: "#5a5a7a" },
    splitLine: { lineStyle: { color: "#f0f0f6", type: "dashed" } },
  },
  tooltip: {
    backgroundColor: "rgba(255,255,255,.96)",
    borderColor:     "#3366cc",
    textStyle:       { color: "#1a1a2e", fontSize: 13 },
  },
});

// ==========================================================
// 二、注册 Dark 主题
// ==========================================================
echarts.registerTheme("darkDashboard", {
  backgroundColor: "transparent",
  textStyle:       { color: "#8899bb" },
  title:           { textStyle: { color: "#e4ecf2" } },
  legend:          { textStyle: { color: "#8899bb" } },
  categoryAxis: {
    axisLine:  { lineStyle: { color: "#2a3550" } },
    axisTick:  { lineStyle: { color: "#2a3550" } },
    axisLabel: { color: "#8899bb" },
    splitLine: { lineStyle: { color: "#222d40", type: "dashed" } },
  },
  valueAxis: {
    axisLine:  { lineStyle: { color: "#2a3550" } },
    axisTick:  { lineStyle: { color: "#2a3550" } },
    axisLabel: { color: "#8899bb" },
    splitLine: { lineStyle: { color: "#222d40", type: "dashed" } },
  },
  tooltip: {
    backgroundColor: "rgba(28,36,56,.96)",
    borderColor:     "#5b8def",
    textStyle:       { color: "#e4ecf2", fontSize: 13 },
  },
});

// ==========================================================
// 三、全局色板（图表专用色，与 CSS 变量一致）
// ==========================================================
const PALETTE = {
  accent:      "#3366cc",
  accentLight: "#5b8def",
  severity:    { Fatal: "#e53935", Serious: "#fb8c00", Slight: "#43a047" },
  hourlyPeak:  "#C85D4D",
  hourlyHigh:  "#F0B79A",
  hourlyNormal:"#FAE7D9",
  hourlyLow:   "#E3EEEF",
  vehicleColors: [
    "#3366cc","#5b8def","#26a69a","#66bb6a","#ffa726",
    "#ef5350","#ab47bc","#42a5f5","#78909c","#8d6e63",
  ],
  roadGradient: ["#3366cc","#2196f3","#03a9f4","#00bcd4","#0097a7","#607d8b"],
  mapColor:    "#c8d6e5",
  mapBorder:   "#ffffff",
  mapEmphasis: "#5b8def",
};

// ==========================================================
// 四、工具函数
// ==========================================================
const DATA_BASE = "data/";

/** 当前活动的 ECharts 主题名，由 themeManager 控制 */
let CURRENT_THEME = "lightDashboard";

/**
 * 安全初始化 ECharts 实例（自动 dispose 旧实例）
 * @deprecated 新代码应使用 initChartOnce + update 模式
 */
function initChart(domId) {
  const dom = document.getElementById(domId);
  if (!dom) return null;
  const old = echarts.getInstanceByDom(dom);
  if (old) old.dispose();
  return echarts.init(dom, CURRENT_THEME);
}

/**
 * ★ 初始化 ECharts 实例（仅一次）
 * 如果 DOM 上已有实例则直接返回，不销毁重建。
 * 供 init-once + update 模式使用。
 */
function initChartOnce(domId) {
  var dom = document.getElementById(domId);
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) return existing;
  return echarts.init(dom, CURRENT_THEME);
}

/**
 * ★ 销毁并清空某个 DOM 上的 ECharts 实例
 * 供主题切换时使用：dispose → 重新 initChartOnce
 */
function disposeChartInstance(domId) {
  var dom = document.getElementById(domId);
  if (!dom) return;
  var inst = echarts.getInstanceByDom(dom);
  if (inst) { inst.dispose(); }
}

// 别名（详情模块兼容）
var initChartDom = initChart;

/** 千分位格式化 */
function fmt(n) { return Number(n).toLocaleString("en-US"); }

/**
 * 通用 tooltip 构建器
 * @param {string} title
 * @param {Array<{label:string, value:string|number, color?:string}>} rows
 */
function tooltipHTML(title, rows) {
  const r = rows.map(rr => {
    const dot = rr.color
      ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${rr.color};margin-right:6px;vertical-align:middle"></span>`
      : "";
    return `<div style="margin-top:3px;font-size:12px">${dot}${rr.label}:&nbsp;<strong>${rr.value}</strong></div>`;
  }).join("");
  return `<div style="font-weight:600;font-size:13px;margin-bottom:3px">${title}</div>${r}`;
}

/** 生成固定数量的颜色数组 */
function pickColors(colors, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(colors[i % colors.length]);
  return out;
}
