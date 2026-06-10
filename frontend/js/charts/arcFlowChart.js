/* ============================================================
   arcFlowChart.js — 平行波浪波段图（Parallel Wave Band Chart）
   3条波浪线：Slight / Serious / Fatal，每条以中线分割为
   左段 Urban + 右段 Rural，振幅映射事故数量。
   数据：arc_flow_data.json
   ============================================================ */

var _waveChart      = null;
var _waveData       = null;
var _waveSelectorInited = false;

var _wavePalette = {
  Fatal:   { base: "#e53935", light: "#ef5350", area: "rgba(229,57,53,0.12)" },
  Serious: { base: "#fb8c00", light: "#ff9800", area: "rgba(251,140,0,0.10)" },
  Slight:  { base: "#43a047", light: "#66bb6a", area: "rgba(67,160,71,0.08)" },
};

function _extractWaveValues(links, severity) {
  var u = 0, r = 0;
  links.forEach(function(l) {
    if (l.source.indexOf("-" + severity) >= 0 || l.target.indexOf("-" + severity) >= 0) {
      if (l.source.indexOf("Urban") >= 0 || l.target.indexOf("Urban") >= 0) u += l.value;
      if (l.source.indexOf("Rural") >= 0 || l.target.indexOf("Rural") >= 0) r += l.value;
    }
  });
  return { urban: u, rural: r };
}

function initArcFlowChart() {
  var dom = document.getElementById("chartArc");
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _waveChart = existing; return existing; }
  _waveChart = echarts.init(dom, CURRENT_THEME);
  if (!_waveSelectorInited) _initWaveSelector();
  return _waveChart;
}

function _initWaveSelector() {
  _waveSelectorInited = true;
  var c = document.getElementById("chartArc");
  if (!c) return;
  var o = c.querySelector(".arcflow__year-select");
  if (o) o.remove();
  var s = document.createElement("select");
  s.className = "arcflow__year-select"; s.id = "arcFlowYearSelector";
  s.style.cssText = "position:absolute;top:4px;right:6px;z-index:10;background:var(--bg-panel,#fff);color:var(--text-primary,#333);border:1px solid var(--border,#e0e0f0);border-radius:5px;padding:2px 20px 2px 6px;font-size:.65rem;font-family:inherit;cursor:pointer;appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 5px center;";
  s.innerHTML = '<option value="all">All</option><option value="2005">2005</option><option value="2006">2006</option><option value="2007">2007</option><option value="2008">2008</option><option value="2009">2009</option><option value="2010">2010</option><option value="2011">2011</option><option value="2012">2012</option><option value="2013">2013</option><option value="2014">2014</option><option value="2015">2015</option>';
  s.addEventListener("change", function() { _applyWaveData(this.value); });
  s.addEventListener("click", function(e) { e.stopPropagation(); });
  c.appendChild(s);
}

function _applyWaveData(year) {
  if (!_waveChart || !_waveData) return;
  if (!year) {
    var sel = document.getElementById("arcFlowYearSelector");
    year = sel ? sel.value : "all";
  }
  var entry = _waveData[year] || _waveData["all"];
  if (!entry || !entry.links) return;

  var h = document.getElementById("chartArc").clientHeight || 130;
  if (h < 60) h = 130;

  var severities = ["Slight","Serious","Fatal"];
  var sevValues = {};
  var maxV = 1;
  severities.forEach(function(s) {
    sevValues[s] = _extractWaveValues(entry.links, s);
    maxV = Math.max(maxV, sevValues[s].urban, sevValues[s].rural);
  });

  var n = 32; // samples
  var yBases = [h*0.78, h*0.50, h*0.22];
  var ampScale = h * 0.18;
  var xLabels = [];
  for (var i = 0; i <= n; i++) {
    if (i === 0) xLabels.push("Urban");
    else if (i === n) xLabels.push("Rural");
    else xLabels.push("");
  }

  var series = severities.map(function(sev, idx) {
    var v = sevValues[sev];
    var urbanNorm = v.urban / maxV;
    var ruralNorm = v.rural / maxV;
    var yBase = yBases[idx];
    var col = _wavePalette[sev];
    var data = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var amp = t < 0.5
        ? urbanNorm * (0.5 + 0.5 * Math.sin(Math.PI * 2 * t))
        : ruralNorm * (0.5 + 0.5 * Math.sin(Math.PI * 2 * t));
      var y = yBase + amp * ampScale;
      data.push(+y.toFixed(1));
    }
    return {
      name: sev,
      type: "line",
      smooth: true,
      symbol: "none",
      lineStyle: { width: 2.5, color: col.base },
      areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:col.base+"44"},{offset:1,color:col.area}]) },
      data: data,
      z: 10 - idx,
      emphasis: { lineStyle: { width: 4.5 } },
    };
  });

  var allY = [];
  series.forEach(function(s) { s.data.forEach(function(v) { allY.push(v); }); });
  var yMin = Math.min.apply(null, allY);
  var yMax = Math.max.apply(null, allY);
  var pad = (yMax - yMin) * 0.15;

  _waveChart.setOption({
    title: { text: "Severity Wave — Urban | Rural", subtext: year === "all" ? "All Years" : year, left: "center", top: 1, textStyle: {fontSize:9,fontWeight:"bold",color:"#3366cc"}, subtextStyle:{fontSize:8,color:"#999"} },
    tooltip: { trigger: "axis", formatter: function(params) {
      if (!params||!params.length) return "";
      var seg = params[0].dataIndex <= 16 ? "Urban" : "Rural";
      var html = "<strong>Severity Wave</strong> ("+seg+")<br>";
      params.forEach(function(p) {
        var sv = sevValues[p.seriesName];
        var val = seg === "Urban" ? sv.urban : sv.rural;
        html += '<div style="margin-top:2px;display:flex;align-items:center"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+p.color+';margin-right:5px"></span><strong>'+p.seriesName+'</strong>: '+fmt(val)+' accidents</div>';
      });
      return html;
    }},
    legend: { data: severities.map(function(s) {
      return {name:s, textStyle:{color:_wavePalette[s].base,fontWeight:"bold",fontSize:8}};
    }), top: 1, left: 6, icon: "roundRect", itemWidth: 8, itemHeight: 4 },
    grid: { left: 4, right: 4, top: 22, bottom: 10 },
    xAxis: { type:"category", data:xLabels, axisLabel:{fontSize:7,fontWeight:"bold",color:"#888"}, axisTick:{show:false}, axisLine:{show:false}, splitLine:{show:true,lineStyle:{color:"rgba(200,200,220,0.15)",type:"dashed"}} },
    yAxis: { type:"value", show:false, min: yMin-pad, max: yMax+pad, splitLine:{show:false} },
    series: series,
    animationDuration: 700,
    animationEasing: "cubicOut",
  }, true);
}

function updateArcFlowChart(d) {
  if (!_waveChart) initArcFlowChart();
  if (!_waveChart || !d) return null;
  _waveData = d;
  _applyWaveData();
  return _waveChart;
}

function disposeArcFlowChart() {
  if (_waveChart) { try { _waveChart.dispose(); } catch(e) {} _waveChart = null; }
  _waveSelectorInited = false;
}

function resizeArcFlowChart() {
  if (_waveChart && _waveData) { try { _waveChart.resize(); _applyWaveData(); } catch(e) {} }
}
var _waveResizeTimer = null;
window.addEventListener("resize", function() {
  clearTimeout(_waveResizeTimer);
  _waveResizeTimer = setTimeout(resizeArcFlowChart, 200);
});

function renderArcTimeChart() { console.warn("[arcFlow] deprecated"); }
