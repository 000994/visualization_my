/* ============================================================
   detailsPanel.js — 右下角详情下钻面板管理器
   职责：监听图表卡片点击 → 加载对应详情模块 → 面板显隐
   功能：拖拽移动 + 右下角缩放 + 关闭
   ============================================================ */

(function () {
  var panel    = document.getElementById("detailPanel");
  var titleEl  = document.getElementById("detailTitle");
  var closeBtn = document.getElementById("detailClose");

  if (!panel) { console.warn("[detailPanel] Panel not found"); return; }

  // ---- 图表卡片 → 下钻内容映射 ----
  var DETAIL_CONFIG = {
    severity: { title: "Severity Distribution — Detail",     render: "renderSeverityDetail", dataKeys: ["vehicle","hourly","district"] },
    hourly:   { title: "24-Hour Distribution — Detail",      render: "renderHourlyDetail",   dataKeys: ["severity","vehicle","daily"] },
    radar:    { title: "Radar — Dimension Analysis",         render: "renderVehicleDetail",  dataKeys: ["severity","hourly","urbanRural"] },
    district: { title: "District TOP 10 — Detail",           render: "renderSeverityDetail", dataKeys: ["vehicle","hourly","district"] },
  };

  var detailDataCache = {};

  window.setDetailData = function (data) { detailDataCache = data; };

  // ---- 打开面板 ----
  function openDetailPanel(chartType) {
    var config = DETAIL_CONFIG[chartType];
    if (!config) return;
    if (titleEl) titleEl.textContent = config.title;
    ["detailChart1","detailChart2","detailChart3"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
    // 每次打开时重置所有 inline 样式，确保 CSS 的 fixed + transform 动画生效
    panel.style.removeProperty("left");
    panel.style.removeProperty("top");
    panel.style.removeProperty("right");
    panel.style.removeProperty("bottom");
    panel.style.removeProperty("width");
    panel.style.removeProperty("height");
    panel.style.removeProperty("max-height");
    panel.style.removeProperty("transform");
    panel.style.removeProperty("transition");
    panel.classList.add("detail-panel--open");
    // 确保面板可见且 pointer-events 生效
    panel.style.pointerEvents = "auto";

    var chartData = {};
    config.dataKeys.forEach(function(key) {
      if (detailDataCache[key]) chartData[key] = detailDataCache[key];
    });
    var renderFn = window[config.render];
    if (typeof renderFn === "function") {
      try { renderFn(chartData); } catch(e) { console.error("[detailPanel] Render error:", e); }
    }

    // ★ 修复：面板滑入动画完成后（300ms），显式 resize 所有子图表
    setTimeout(function() {
      ["detailChart1","detailChart2","detailChart3"].forEach(function(id) {
        var dom = document.getElementById(id);
        if (dom) {
          var inst = echarts.getInstanceByDom(dom);
          if (inst) { try { inst.resize(); } catch(e) {} }
        }
      });
    }, 350);
  }

  // ---- 关闭面板 ----
  function closeDetailPanel() {
    panel.classList.remove("detail-panel--open");
    panel.style.pointerEvents = "none";
    // 清除所有面板的选中状态
    Object.keys(cardMap).forEach(function(k) {
      var c = document.getElementById(k);
      if (c) c.classList.remove("panel--selected");
    });
    // 重置拖拽和缩放覆盖的样式
    panel.style.removeProperty("left");
    panel.style.removeProperty("top");
    panel.style.removeProperty("right");
    panel.style.removeProperty("bottom");
    panel.style.removeProperty("width");
    panel.style.removeProperty("height");
    panel.style.removeProperty("max-height");
    panel.style.removeProperty("transform");
    if (typeof disposeDetailCharts === "function") disposeDetailCharts();
  }

  // ---- 关闭按钮 ----
  if (closeBtn) closeBtn.addEventListener("click", closeDetailPanel);

  // ---- 点击图表卡片触发 ----
  var cardMap = {
    panelSeverity: "severity", panelHourly: "hourly",
    panelRadar: "radar", panelDistrict: "district",
  };
  Object.keys(cardMap).forEach(function(cardId) {
    var card = document.getElementById(cardId);
    if (!card) return;
    card.classList.add("panel--clickable");
    // 添加详情入口提示标识
    var badge = document.createElement("span");
    badge.className = "panel__detail-badge";
    badge.textContent = "🔍 Detail";
    card.appendChild(badge);
    card.addEventListener("click", function(e) {
      // 排除所有内部交互元素
      if (e.target.closest(".panel__tab") || e.target.closest(".panel__tabs") ||
          e.target.closest("canvas") || e.target.closest("div[id^='chart']") ||
          e.target.closest(".panel__detail-badge") ||
          e.target.closest(".calendar__controls") || e.target.closest(".calendar__metric-btn") ||
          e.target.closest(".calendar__year-select")) {
        return;
      }

      var chartType = cardMap[cardId];
      // 移除其他面板的选中状态
      Object.keys(cardMap).forEach(function(k) {
        var c = document.getElementById(k);
        if (c) c.classList.remove("panel--selected");
      });
      if (panel.classList.contains("detail-panel--open") && panel.getAttribute("data-type") === chartType) {
        closeDetailPanel(); panel.removeAttribute("data-type"); return;
      }
      card.classList.add("panel--selected");
      panel.setAttribute("data-type", chartType);
      openDetailPanel(chartType);
    });
  });

  // ESC 关闭
  document.addEventListener("keydown", function(e) { if (e.key === "Escape") closeDetailPanel(); });

  // ==========================================================
  //  拖拽移动（mousedown → window.mousemove → window.mouseup）
  // ==========================================================
  (function initDrag() {
    var bar = panel.querySelector(".detail-panel__bar");
    if (!bar) { console.warn("[detailPanel] Drag bar not found"); return; }

    var dragging = false, startX, startY, startLeft, startTop;

    bar.addEventListener("mousedown", function(e) {
      if (e.target === closeBtn) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      var rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop  = rect.top;

      // 转为 left/top 定位（覆盖 CSS 的 right/bottom/transform）
      panel.style.setProperty("right", "auto", "important");
      panel.style.setProperty("bottom", "auto", "important");
      panel.style.setProperty("transform", "none", "important");
      panel.style.setProperty("transition", "none", "important");
      panel.style.setProperty("left", startLeft + "px", "important");
      panel.style.setProperty("top",  startTop  + "px", "important");
      panel.style.setProperty("user-select", "none", "important");
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    window.addEventListener("mousemove", function(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      panel.style.setProperty("left", (startLeft + dx) + "px", "important");
      panel.style.setProperty("top",  (startTop  + dy) + "px", "important");
    });

    window.addEventListener("mouseup", function() {
      if (!dragging) return;
      dragging = false;
      panel.style.removeProperty("transition");
      panel.style.removeProperty("user-select");
      document.body.style.userSelect = "";
    });
  })();

  // ==========================================================
  //  右下角缩放
  // ==========================================================
  (function initResize() {
    var handle = document.createElement("div");
    handle.style.cssText =
      "position:absolute;right:0;bottom:0;width:18px;height:18px;" +
      "cursor:nwse-resize;z-index:100;" +
      "background:linear-gradient(135deg,transparent 50%,#aaa 50%);" +
      "border-radius:0 0 8px 0;";
    panel.appendChild(handle);

    var resizing = false, sx, sy, ow, oh;

    handle.addEventListener("mousedown", function(e) {
      resizing = true;
      sx = e.clientX; sy = e.clientY;
      ow = panel.offsetWidth; oh = panel.offsetHeight;
      panel.style.setProperty("transition", "none", "important");
      document.body.style.userSelect = "none";
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener("mousemove", function(e) {
      if (!resizing) return;
      var nw = Math.max(300, Math.min(700, ow + e.clientX - sx));
      var nh = Math.max(260, Math.min(600, oh + e.clientY - sy));
      panel.style.setProperty("width", nw + "px", "important");
      panel.style.setProperty("max-height", nh + "px", "important");
      panel.style.setProperty("height", nh + "px", "important");
    });

    window.addEventListener("mouseup", function() {
      if (!resizing) return;
      resizing = false;
      panel.style.removeProperty("transition");
      document.body.style.userSelect = "";
    });

    // 窗口缩放时重置
    window.addEventListener("resize", function() {
      panel.style.removeProperty("width");
      panel.style.removeProperty("height");
      panel.style.removeProperty("max-height");
    });
  })();

  console.log("[detailPanel] Ready — drag bar to move, bottom-right corner to resize");
})();
