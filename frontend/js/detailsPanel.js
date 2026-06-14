/* Detail drilldown panel manager. */
(function () {
  var panel = document.getElementById("detailPanel");
  var titleEl = document.getElementById("detailTitle");
  var closeBtn = document.getElementById("detailClose");

  if (!panel) { console.warn("[detailPanel] Panel not found"); return; }

  var DETAIL_CONFIG = {
    hourly: { title: "24-Hour Distribution - Detail", render: "renderRegionHourlyDetail", provider: "getRegionDetailData" },
    radar: { title: "Region Structure - Detail", render: "renderRegionRadarDetail", provider: "getRegionDetailData" },
    arc: { title: "Urban / Rural Trend - Detail", render: "renderRegionArcDetail", provider: "getRegionDetailData" },
  };

  var cardMap = {
    panelRadar: "radar",
    panelHourly: "hourly",
    panelArc: "arc",
  };

  function clearRows() {
    ["detailChart1", "detailChart2", "detailChart3"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
  }

  function resetPanelInlineLayout() {
    ["left", "top", "right", "bottom", "width", "height", "max-height", "transform", "transition"].forEach(function(prop) {
      panel.style.removeProperty(prop);
    });
  }

  function collectChartData(chartType, config) {
    if (config.provider && typeof window[config.provider] === "function") {
      return window[config.provider](chartType) || {};
    }
    return {};
  }

  function openDetailPanel(chartType) {
    var config = DETAIL_CONFIG[chartType];
    if (!config) return;

    if (titleEl) titleEl.textContent = config.title;
    clearRows();
    resetPanelInlineLayout();
    panel.classList.add("detail-panel--open");
    panel.style.pointerEvents = "auto";

    var renderFn = window[config.render];
    if (typeof renderFn === "function") {
      try {
        renderFn(collectChartData(chartType, config));
      } catch (e) {
        console.error("[detailPanel] Render error:", e);
      }
    }

    setTimeout(function() {
      ["detailChart1", "detailChart2", "detailChart3"].forEach(function(id) {
        var dom = document.getElementById(id);
        var inst = dom ? echarts.getInstanceByDom(dom) : null;
        if (inst) { try { inst.resize(); } catch(e) {} }
      });
    }, 350);
  }

  function closeDetailPanel() {
    panel.classList.remove("detail-panel--open");
    panel.style.pointerEvents = "none";
    Object.keys(cardMap).forEach(function(k) {
      var c = document.getElementById(k);
      if (c) c.classList.remove("panel--selected");
    });
    resetPanelInlineLayout();
    if (typeof disposeDetailCharts === "function") disposeDetailCharts();
  }

  function activateCard(cardId, chartType) {
    Object.keys(cardMap).forEach(function(k) {
      var c = document.getElementById(k);
      if (c) c.classList.remove("panel--selected");
    });

    if (panel.classList.contains("detail-panel--open") && panel.getAttribute("data-type") === chartType) {
      closeDetailPanel();
      panel.removeAttribute("data-type");
      return;
    }

    var card = document.getElementById(cardId);
    if (card) card.classList.add("panel--selected");
    panel.setAttribute("data-type", chartType);
    openDetailPanel(chartType);
  }

  window.refreshOpenDetailPanel = function() {
    if (!panel.classList.contains("detail-panel--open")) return;
    var chartType = panel.getAttribute("data-type");
    if (chartType && DETAIL_CONFIG[chartType]) openDetailPanel(chartType);
  };

  if (closeBtn) closeBtn.addEventListener("click", closeDetailPanel);
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") closeDetailPanel();
  });

  window.addEventListener("regionStateChanged", function() {
    window.refreshOpenDetailPanel();
  });

  Object.keys(cardMap).forEach(function(cardId) {
    var card = document.getElementById(cardId);
    if (!card) return;

    card.classList.add("panel--clickable");
    var badge = document.createElement("button");
    badge.type = "button";
    badge.className = "panel__detail-badge";
    badge.textContent = "Detail";
    badge.title = "Open detail view";
    card.appendChild(badge);

    badge.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      activateCard(cardId, cardMap[cardId]);
    });

    card.addEventListener("click", function(e) {
      if (e.target.closest(".panel__detail-badge")) return;
      if (e.target.closest(".panel__tab") || e.target.closest(".panel__tabs") ||
          e.target.closest("canvas") || e.target.closest("div[id^='chart']") ||
          e.target.closest(".calendar__controls") || e.target.closest(".calendar__metric-btn") ||
          e.target.closest(".calendar__year-select") || e.target.closest("select")) {
        return;
      }
      activateCard(cardId, cardMap[cardId]);
    });
  });

  (function initDrag() {
    var bar = panel.querySelector(".detail-panel__bar");
    if (!bar) return;

    var dragging = false, startX, startY, startLeft, startTop;
    bar.addEventListener("mousedown", function(e) {
      if (e.target === closeBtn) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      var rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      panel.style.setProperty("right", "auto", "important");
      panel.style.setProperty("bottom", "auto", "important");
      panel.style.setProperty("transform", "none", "important");
      panel.style.setProperty("transition", "none", "important");
      panel.style.setProperty("left", startLeft + "px", "important");
      panel.style.setProperty("top", startTop + "px", "important");
      panel.style.setProperty("user-select", "none", "important");
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    window.addEventListener("mousemove", function(e) {
      if (!dragging) return;
      panel.style.setProperty("left", (startLeft + e.clientX - startX) + "px", "important");
      panel.style.setProperty("top", (startTop + e.clientY - startY) + "px", "important");
    });

    window.addEventListener("mouseup", function() {
      if (!dragging) return;
      dragging = false;
      panel.style.removeProperty("transition");
      panel.style.removeProperty("user-select");
      document.body.style.userSelect = "";
    });
  })();

  (function initResize() {
    var handle = document.createElement("div");
    handle.className = "detail-panel__resize";
    panel.appendChild(handle);

    var resizing = false, sx, sy, ow, oh;
    handle.addEventListener("mousedown", function(e) {
      resizing = true;
      sx = e.clientX;
      sy = e.clientY;
      ow = panel.offsetWidth;
      oh = panel.offsetHeight;
      panel.style.setProperty("transition", "none", "important");
      document.body.style.userSelect = "none";
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener("mousemove", function(e) {
      if (!resizing) return;
      var nw = Math.max(360, Math.min(760, ow + e.clientX - sx));
      var nh = Math.max(320, Math.min(680, oh + e.clientY - sy));
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

    window.addEventListener("resize", function() {
      panel.style.removeProperty("width");
      panel.style.removeProperty("height");
      panel.style.removeProperty("max-height");
    });
  })();

  console.log("[detailPanel] Ready");
})();
