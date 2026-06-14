/* Shared region/year selection state for map-linked views. */
(function() {
  var state = {
    region: null,
    year: "all",
    source: "init",
  };
  var listeners = [];

  function snapshot() {
    return {
      region: state.region,
      year: state.year,
      source: state.source,
    };
  }

  function emit() {
    var detail = snapshot();
    listeners.forEach(function(fn) {
      try { fn(detail); } catch(e) { console.warn("[regionState] listener failed:", e); }
    });
    window.dispatchEvent(new CustomEvent("regionStateChanged", { detail: detail }));
  }

  function setRegion(region, year, source) {
    state.region = region || null;
    if (year) state.year = year;
    state.source = source || "external";
    emit();
  }

  function setYear(year, source) {
    state.year = year || "all";
    state.source = source || "year";
    emit();
  }

  function clearRegion(source) {
    state.region = null;
    state.source = source || "clear";
    emit();
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return function() {};
    listeners.push(fn);
    fn(snapshot());
    return function() {
      listeners = listeners.filter(function(item) { return item !== fn; });
    };
  }

  window.RegionState = {
    get: snapshot,
    setRegion: setRegion,
    setYear: setYear,
    clearRegion: clearRegion,
    subscribe: subscribe,
  };
})();
