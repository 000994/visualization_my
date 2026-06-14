/* Header statistics renderer.
   The original filter controls were removed from the page, so this module now
   only owns the stat cards and keeps a compatibility getFilterState API. */
(function() {
  var statData = null;

  function getFilterState() {
    return { year: "all", road: "all", urban: "all" };
  }

  function setValue(id, value) {
    var card = document.getElementById(id);
    if (!card) return;
    var valueEl = card.querySelector(".stat-badge__val");
    if (valueEl) valueEl.textContent = value;
  }

  function formatNumber(value) {
    return value || value === 0 ? Number(value).toLocaleString() : "--";
  }

  function renderStatCards() {
    if (!statData) return;
    setValue("statTotal", formatNumber(statData.total));
    setValue("statFatal", formatNumber(statData.fatal));
    setValue("statCasualty", formatNumber(statData.casualties));
    setValue("statPeak", statData.peakHour || "--");
  }

  function setStatData(data) {
    statData = data || null;
    renderStatCards();
  }

  window.getFilterState = getFilterState;
  window.setStatData = setStatData;
})();
