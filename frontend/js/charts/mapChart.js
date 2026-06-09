/* ============================================================
   mapChart.js — Leaflet 地图（Canvas 渲染 + 增量更新）
   设计：OSM 底图 + 去边框柔化热力色块 + 图例 + 散点
   数据源：data/uk_geo.json（12 UK 区域）+ map_yearly_data.json
   优化：
     1. Canvas renderer — 散点绘制在单张 Canvas 上，避免 5000 DOM 节点
     2. 年份切换仅更换 GeoJSON 层 + 散点层，Leaflet 实例保持不销毁
     3. 散点点击直接读取 e.target.options.detailData，无需 O(n) 扫描
   ============================================================ */

var UK_GEOJSON_PATH = "data/uk_geo.json";
var _leafletMap     = null;    // Leaflet 实例（生命周期内仅创建一次）
var _geoJsonCache   = null;    // uk_geo.json 内存缓存
var _geoJsonLayer   = null;    // 当前 GeoJSON 热力覆盖层
var _legendControl  = null;    // 图例控件
var _labelMarkers   = [];      // 区域标签 markers
var _pointLayer     = null;    // 事故散点 LayerGroup
var _popupEl        = null;    // 自定义弹窗 DOM
var _mapReady       = false;   // Leaflet 实例是否已初始化

// ============================================================
//  事故详情弹窗（详情字段从散点数据直接读取）
// ============================================================
function showAccidentPopup(detail) {
  if (!detail) return;
  if (_popupEl) { _popupEl.remove(); _popupEl = null; }

  var weatherMap = {"1":"Fine","2":"Raining","3":"Snowing","4":"Fog","5":"Other","6":"Windy","7":"Unknown"};
  var surfaceMap = {"1":"Dry","2":"Wet","3":"Snow","4":"Frost","5":"Flood","6":"Unknown"};

  var weather = weatherMap[detail.Weather_Conditions] || "Code " + detail.Weather_Conditions;
  var surface = surfaceMap[detail.Road_Surface_Conditions] || "Code " + detail.Road_Surface_Conditions;

  var sevColor = "#3366cc";
  if (detail.severity_label === "Fatal") sevColor = "#e53935";
  else if (detail.severity_label === "Serious") sevColor = "#fb8c00";

  _popupEl = document.createElement("div");
  _popupEl.className = "accident-popup";
  _popupEl.innerHTML =
    '<div class="accident-popup__inner">' +
      '<button class="accident-popup__close">&times;</button>' +
      '<div class="accident-popup__header" style="border-left:4px solid ' + sevColor + '">' +
        '<span class="accident-popup__sev" style="background:' + sevColor + '">' + (detail.severity_label || "?") + '</span>' +
        '<span class="accident-popup__date">' + (detail.Date || "?") + ' ' + (detail.Time || "--:--") + '</span>' +
      '</div>' +
      '<div class="accident-popup__body">' +
        '<div class="accident-popup__row"><span class="accident-popup__label">Location</span><span>' + (detail.district_label || "Unknown") + '</span></div>' +
        '<div class="accident-popup__row"><span class="accident-popup__label">Road</span><span>' + (detail.road_label || "Unknown") + '</span></div>' +
        '<div class="accident-popup__row"><span class="accident-popup__label">Light</span><span>' + (detail.light_label || "Unknown") + '</span></div>' +
        '<div class="accident-popup__row"><span class="accident-popup__label">Weather</span><span>' + weather + '</span></div>' +
        '<div class="accident-popup__row"><span class="accident-popup__label">Surface</span><span>' + surface + '</span></div>' +
        '<div class="accident-popup__row"><span class="accident-popup__label">Speed Limit</span><span>' + (detail.Speed_limit || "?") + ' mph</span></div>' +
        '<div class="accident-popup__row"><span class="accident-popup__label">Vehicles</span><span>' + (detail.Number_of_Vehicles || "0") + '</span></div>' +
        '<div class="accident-popup__row"><span class="accident-popup__label">Casualties</span><span>' + (detail.Number_of_Casualties || "0") + '</span></div>' +
        '<div class="accident-popup__row"><span class="accident-popup__label">Day</span><span>' + (detail.day_label || "Unknown") + '</span></div>' +
        '<div class="accident-popup__row"><span class="accident-popup__label">Area</span><span>' + (detail.urban_rural_label || "Unknown") + '</span></div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(_popupEl);

  _popupEl.style.position = "fixed";
  _popupEl.style.right = "24px";
  _popupEl.style.top = "50%";
  _popupEl.style.transform = "translateY(-50%)";
  _popupEl.style.zIndex = "10000";

  _popupEl.querySelector(".accident-popup__close").addEventListener("click", function() {
    _popupEl.remove();
    _popupEl = null;
  });

  setTimeout(function() {
    document.addEventListener("click", function closePopup(e) {
      if (_popupEl && !_popupEl.contains(e.target)) {
        _popupEl.remove();
        _popupEl = null;
        document.removeEventListener("click", closePopup);
      }
    });
  }, 100);
}

// ============================================================
//  散点图层 — Canvas 渲染，每点嵌入 detailData
// ============================================================
function _renderPointLayer(points) {
  if (!_leafletMap) return;
  if (_pointLayer) {
    try { _leafletMap.removeLayer(_pointLayer); } catch(e) {}
    _pointLayer = null;
  }
  if (!points || !points.length) return;

  function colorBySeverity(sev) {
    if (sev === "Fatal") return "#e53935";
    if (sev === "Serious") return "#fb8c00";
    return "#3366cc";
  }

  var markers = [];
  var maxRender = Math.min(points.length, 5000);
  var step = Math.max(1, Math.floor(points.length / maxRender));

  for (var i = 0; i < points.length; i += step) {
    var p = points[i];
    if (p.Longitude == null || p.Latitude == null) continue;

    var sev = p.severity_label || "Slight";
    var color = colorBySeverity(sev);
    var radius = sev === "Fatal" ? 6 : (sev === "Serious" ? 4 : 3);
    var opacity = sev === "Fatal" ? 0.8 : (sev === "Serious" ? 0.6 : 0.35);

    var marker = L.circleMarker([p.Latitude, p.Longitude], {
      radius: radius,
      fillColor: color,
      color: "rgba(255,255,255,0.3)",
      weight: 0.5,
      opacity: 0.6,
      fillOpacity: opacity,
      // ★ 关键优化：详情数据直接嵌入 marker options，点击时 O(1) 读取
      detailData: p,
    });

    marker.bindTooltip(
      "<strong>" + sev + "</strong><br><small>Click for details</small>",
      { className: "map-point-tooltip", direction: "top", offset: [0, -radius] }
    );

    marker.on("click", function(e) {
      // ★ O(1) 读取，无需扫描 _detailPoints 数组
      var detail = e.target.options.detailData || {};
      showAccidentPopup(detail);
    });

    markers.push(marker);
  }

  _pointLayer = L.layerGroup(markers).addTo(_leafletMap);
}

// ============================================================
//  GeoJSON 加载（带缓存）
// ============================================================
async function _loadUKGeoJSON() {
  if (_geoJsonCache) return _geoJsonCache;
  try {
    var resp = await fetch(UK_GEOJSON_PATH);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    var geo = await resp.json();
    if (!geo.features || !Array.isArray(geo.features))
      throw new Error("Invalid GeoJSON");
    _geoJsonCache = geo;
    return geo;
  } catch (e) { console.error("[map] load fail:", e.message); return null; }
}

// ============================================================
//  地名 → 12 区域关键词匹配
// ============================================================
function _matchRegions(districtData, geoJson) {
  if (!districtData || !districtData.length || !geoJson) return [];
  var KEYWORD_MAP = {
    "Scotland":["scotland","glasgow","edinburgh","aberdeen","dundee","fife","highland","lothian","strathclyde","tayside","grampian","ayrshire","lanarkshire","renfrewshire","stirling","falkirk","dumfries","borders","moray","angus","perth","clackmannan","dunbarton","inverclyde","midlothian","orkney","shetland","hebrides","western isles","argyll"],
    "North East":["northumberland","newcastle","durham","tyneside","sunderland","gateshead","hartlepool","stockton","middlesbrough","redcar","darlington","cleveland","berwick","blyth","wansbeck","wear valley","derwentside","chester-le-street","easington","teesdale","sedgefield","alnwick","castle morpeth","tynedale"],
    "North West":["cumbria","carlisle","lancashire","lancaster","blackpool","blackburn","preston","burnley","chorley","fleetwood","manchester","bolton","bury","oldham","rochdale","salford","stockport","tameside","trafford","wigan","liverpool","knowsley","sefton","st. helens","wirral","chester","warrington","macclesfield","crewe","cheshire","merseyside","halton","congleton","ellesmere","wyre","south ribble","south lakeland","ribble valley","pendle","hyndburn","rossendale","allerdale","barrow","copeland","eden","furness","fylde","vale royal"],
    "Yorkshire":["yorkshire","york","leeds","bradford","calderdale","kirklees","wakefield","barnsley","doncaster","rotherham","sheffield","hull","harrogate","scarborough","selby","craven","richmondshire","ryedale","hambleton","humberside","lincolnshire","grimsby","scunthorpe","east riding","north lincoln","north east lincoln"],
    "West Midlands":["birmingham","coventry","dudley","sandwell","solihull","walsall","wolverhampton","stafford","stoke","telford","shrewsbury","shropshire","worcester","bromsgrove","redditch","malvern","hereford","lichfield","tamworth","burton","nuneaton","rugby","warwick","stratford","cannock","bridgnorth","oswestry","wyre forest","wychavon","newcastle-under-lyme","staffordshire moorlands","south staffordshire","north warwickshire"],
    "East Midlands":["derbyshire","derby","nottingham","leicester","leicestershire","harborough","rutland","northampton","northamptonshire","kettering","corby","daventry","wellingborough","milton keynes","lincoln","boston","mansfield","ashfield","broxtowe","gedling","newark","rushcliffe","bassetlaw","south holland","north kesteven","south kesteven","west lindsey","east lindsey","amber valley","bolsover","chesterfield","erewash","high peak","melton","oadby","blaby","hinckley","charnwood","south derbyshire","north east derbyshire","derbyshire dales"],
    "East of England":["cambridge","peterborough","norfolk","norwich","suffolk","ipswich","bedford","luton","hertford","stevenage","watford","st. albans","welwyn","broxbourne","dacorum","essex","chelmsford","colchester","southend","basildon","braintree","brentwood","castle point","epping","harlow","maldon","rochford","tendring","thurrock","uttlesford","fenland","huntingdon","breckland","broadland","great yarmouth","kings lynn","babergh","forest heath","mid suffolk","st. edmundsbury","suffolk coastal","waveney","three rivers","hertsmere","bedfordshire","hertfordshire","cambridgeshire","south cambridgeshire","east cambridgeshire","south bedfordshire","mid bedfordshire","north hertfordshire","east hertfordshire","east northamptonshire","south northamptonshire"],
    "London":["london","westminster","camden","islington","hackney","tower hamlets","greenwich","lewisham","southwark","lambeth","wandsworth","hammersmith","kensington","chelsea","waltham forest","redbridge","havering","barking","dagenham","newham","bexley","bromley","croydon","sutton","merton","kingston","richmond","hounslow","hillingdon","ealing","brent","harrow","barnet","haringey","enfield","city of london","heathrow"],
    "South East":["kent","canterbury","dover","maidstone","medway","thanet","ashford","dartford","folkestone","gravesham","sevenoaks","swale","tonbridge","tunbridge","surrey","woking","guildford","elmbridge","epsom","spelthorne","reigate","runnymede","tandridge","waverley","sussex","brighton","eastbourne","hastings","lewes","rother","wealden","crawley","horsham","worthing","adur","arun","chichester","hampshire","portsmouth","southampton","basingstoke","winchester","eastleigh","fareham","gosport","hart","havant","new forest","rushmoor","test valley","east hampshire","buckingham","aylesbury","wycombe","chiltern","oxford","cherwell","vale of white horse","south oxfordshire","west oxfordshire","reading","slough","windsor","maidenhead","bracknell","wokingham","west berkshire","isle of wight","mole valley","south bucks","buckinghamshire","oxfordshire","surrey heath","shepway"],
    "South West":["devon","exeter","plymouth","torbay","torridge","cornwall","caradon","carrick","kerrier","penwith","restormel","somerset","bristol","bath","mendip","sedgemoor","taunton","gloucester","cheltenham","cotswold","forest of dean","stroud","tewkesbury","wiltshire","swindon","salisbury","kennet","dorset","bournemouth","poole","christchurch","purbeck","weymouth","portland","gloucestershire","south gloucestershire","north somerset","bath and","teignbridge","south hams","mid devon","west devon","east devon","north dorset","west dorset","east dorset","north wiltshire","west wiltshire","south somerset","taunton deane","west somerset","north cornwall"],
    "Wales":["wales","cardiff","swansea","newport","gwynedd","conwy","denbigh","flint","wrexham","anglesey","blaenau gwent","caerphilly","monmouth","torfaen","bridgend","merthyr","neath port talbot","rhondda","cynon","taff","vale of glamorgan","ceredigion","carmarthen","pembroke","powys","dyfed"],
    "Northern Ireland":["northern","belfast","antrim","armagh","down","fermanagh","londonderry","tyrone","ulster"],
  };
  var feats = geoJson.features;
  var rc = {}; feats.forEach(function(f){ rc[f.properties.name] = 0; });
  districtData.forEach(function(d){
    var nm = (d.district_label||"").toLowerCase().trim();
    for (var r in KEYWORD_MAP) {
      if (!rc.hasOwnProperty(r)) continue;
      for (var i=0; i<KEYWORD_MAP[r].length; i++) {
        if (nm.indexOf(KEYWORD_MAP[r][i])!==-1) { rc[r]+=d.count; return; }
      }
    }
  });
  var out = [];
  for (var r in rc) { if (rc[r]>0) out.push({name:r,value:rc[r]}); }
  return out;
}

// ============================================================
//  色阶函数 — 柔和渐变
// ============================================================
function _makeGetHeatColor(dataMin, dataMax) {
  return function(value) {
    var ratio = dataMax > dataMin ? (value - dataMin) / (dataMax - dataMin) : 0;
    if (ratio < 0.2)      return "rgba(235,245,255,0.45)";
    else if (ratio < 0.4) return "rgba(180,215,250,0.50)";
    else if (ratio < 0.6) return "rgba(100,175,240,0.55)";
    else if (ratio < 0.8) return "rgba(50,130,210,0.60)";
    else                  return "rgba(25,80,160,0.65)";
  };
}

// ============================================================
//  GeoJSON 热力层
// ============================================================
function _buildGeoJsonLayer(geoJson, mapData, getHeatColor) {
  return L.geoJSON(geoJson, {
    style: function(feature) {
      var name = feature.properties.name;
      var match = null;
      for (var i = 0; i < mapData.length; i++) {
        if (mapData[i].name === name) { match = mapData[i]; break; }
      }
      return {
        fillColor: match ? getHeatColor(match.value) : "rgba(200,214,229,0.2)",
        color: "rgba(255,255,255,0.15)",
        weight: 1,
        opacity: 0.3,
        fillOpacity: 0.55,
      };
    },
    onEachFeature: function(feature, layer) {
      var name = feature.properties.name;
      var match = null;
      for (var i = 0; i < mapData.length; i++) {
        if (mapData[i].name === name) { match = mapData[i]; break; }
      }
      if (match) {
        layer.bindTooltip(
          "<strong>" + name + "</strong><br>Accidents: " + match.value.toLocaleString(),
          { sticky: true, className: "map-tooltip" }
        );
      }
      layer.on("mouseover", function(){
        layer.setStyle({ weight: 2, color: "rgba(255,255,255,0.6)", opacity: 0.8, fillOpacity: 0.75 });
      });
      layer.on("mouseout", function(){
        layer.setStyle({ weight: 1, color: "rgba(255,255,255,0.15)", opacity: 0.3, fillOpacity: 0.55 });
      });
      layer.on("click", function(){
        if (_geoJsonLayer) {
          _geoJsonLayer.eachLayer(function(l){
            l.setStyle({ weight: 1, color: "rgba(255,255,255,0.15)", opacity: 0.3, fillOpacity: 0.55 });
          });
        }
        layer.setStyle({ weight: 2.5, color: "#fff", opacity: 0.9, fillOpacity: 0.75 });
      });
    },
  });
}

// ============================================================
//  区域标签
// ============================================================
function _addRegionLabels(geoJson) {
  if (!_leafletMap) return;
  _clearRegionLabels();
  geoJson.features.forEach(function(feature){
    var coords = feature.geometry.coordinates[0];
    if (!coords || coords.length < 3) return;
    var cx = 0, cy = 0;
    for (var i = 0; i < coords.length; i++) { cx += coords[i][0]; cy += coords[i][1]; }
    cx /= coords.length;
    cy /= coords.length;
    var m = L.marker([cy, cx], {
      icon: L.divIcon({
        className: "map-region-label",
        html: feature.properties.name,
        iconSize: null,
        iconAnchor: [0, 0]
      }),
      interactive: false,
      keyboard: false,
    }).addTo(_leafletMap);
    _labelMarkers.push(m);
  });
}

function _clearRegionLabels() {
  _labelMarkers.forEach(function(m) {
    try { _leafletMap.removeLayer(m); } catch(e) {}
  });
  _labelMarkers = [];
}

// ============================================================
//  图例
// ============================================================
function _addLegend(dataMin, dataMax) {
  if (_legendControl) {
    try { _leafletMap.removeControl(_legendControl); } catch(e) {}
    _legendControl = null;
  }
  var colors = ["#ebf5ff","#b4d7fa","#64aff0","#3282d2","#1950a0"];
  var labels = [];
  var steps = 4;
  for (var i = 0; i <= steps; i++) {
    var v = dataMin + (dataMax - dataMin) * i / steps;
    var label;
    if (dataMax >= 10000)      label = (v/1000).toFixed(0) + 'k';
    else if (dataMax >= 1000)  label = (v/1000).toFixed(1) + 'k';
    else                       label = v.toFixed(0);
    labels.push(
      '<i style="background:' + colors[Math.min(i, colors.length-1)] +
      ';width:16px;height:12px;display:inline-block;margin-right:4px;border-radius:2px"></i> ' + label
    );
  }
  _legendControl = L.control({position: "bottomleft"});
  _legendControl.onAdd = function() {
    var div = L.DomUtil.create("div", "map-legend");
    div.innerHTML =
      '<div style="background:rgba(255,255,255,0.9);padding:6px 10px;border-radius:6px;' +
      'box-shadow:0 1px 6px rgba(0,0,0,0.15);font-size:11px;line-height:1.6">' +
      '<div style="font-weight:600;margin-bottom:2px;font-size:10px;color:#666">Accidents</div>' +
      labels.join('') +
      '</div>';
    return div;
  };
  _legendControl.addTo(_leafletMap);
}

// ============================================================
//  ★ 初次初始化 Leaflet 实例（仅调用一次）
//    使用 Canvas 渲染器，避免 5000 SVG <circle> DOM 节点
// ============================================================
async function _initLeafletMap(containerId) {
  if (_leafletMap) {
    // 如果已存在实例，仅 invalidateSize
    try { _leafletMap.invalidateSize(); } catch(e) {}
    return _leafletMap;
  }

  var baseDiv = document.getElementById(containerId);
  if (!baseDiv) return null;
  baseDiv.innerHTML = "";
  baseDiv.style.width = "100%";
  baseDiv.style.height = "100%";

  // ★ 性能关键：preferCanvas 让所有 vector layers 绘制在 Canvas 上
  _leafletMap = L.map(baseDiv, {
    center: [55.3781, -3.4360],
    zoom: 5,
    minZoom: 4,
    maxZoom: 18,
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    dragging: true,
    maxBounds: [[40, -20], [65, 15]],
    maxBoundsViscosity: 1.0,
    renderer: L.canvas(),     // ★ Canvas 渲染器 — 所有矢量图形绘制在单一 Canvas 上
  });

  var tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    maxZoom: 18,
    maxNativeZoom: 18,
    noWrap: true,
  }).addTo(_leafletMap);

  // 暴露全局引用供主题切换时更换瓦片 URL
  if (typeof window !== "undefined") {
    window._leafletMap   = _leafletMap;
    window._mapTileLayer = tileLayer;
  }

  console.log("[map] Leaflet instance created (Canvas renderer)");
  return _leafletMap;
}

// ============================================================
//  初次渲染地图（创建 Leaflet 实例 + GeoJSON + 散点）
// ============================================================
async function renderMapChart(opts) {
  opts = opts || {};
  var districtData = opts.districtData;
  var points       = opts.points;
  var container    = document.getElementById("chartMap");
  if (!container) return null;

  var loadingEl = document.getElementById("mapLoading");
  if (loadingEl) loadingEl.style.display = "flex";

  // 加载 GeoJSON（缓存后仅首次 await）
  var geoJson;
  try {
    geoJson = await _loadUKGeoJSON();
  } catch (e) {
    if (loadingEl) { loadingEl.textContent = "Map unavailable: " + e.message; loadingEl.style.display = "flex"; }
    throw e;
  }
  if (!geoJson) {
    if (loadingEl) { loadingEl.textContent = "Map unavailable — run: python gen_map.py"; loadingEl.style.display = "flex"; }
    return null;
  }

  // 初始化 Leaflet（仅首次创建，后续复用）
  var map = await _initLeafletMap("leafletBase");
  if (!map) return null;

  if (loadingEl) loadingEl.style.display = "none";

  // 计算热力数据
  var mapData = _matchRegions(districtData, geoJson);
  var dataMin = mapData.length ? Math.min.apply(null, mapData.map(function(d){return d.value;})) : 0;
  var dataMax = mapData.length ? Math.max.apply(null, mapData.map(function(d){return d.value;})) : 1;
  var getHeatColor = _makeGetHeatColor(dataMin, dataMax);

  // 清除旧层
  if (_geoJsonLayer) {
    try { _leafletMap.removeLayer(_geoJsonLayer); } catch(e) {}
    _geoJsonLayer = null;
  }
  _clearRegionLabels();

  // 创建热力层
  _geoJsonLayer = _buildGeoJsonLayer(geoJson, mapData, getHeatColor).addTo(_leafletMap);

  // 区域标签
  _addRegionLabels(geoJson);

  // 图例
  _addLegend(dataMin, dataMax);

  // 散点
  _renderPointLayer(points);

  _mapReady = true;
  console.log("[map] Initial render done");

  return {
    dispose: function() {
      try { if (_geoJsonLayer) _leafletMap.removeLayer(_geoJsonLayer); _geoJsonLayer = null; } catch(e) {}
    },
    disposeFull: function() {
      this.dispose();
      _clearRegionLabels();
      if (_legendControl) { try { _leafletMap.removeControl(_legendControl); } catch(e) {}; _legendControl = null; }
      if (_pointLayer)    { try { _leafletMap.removeLayer(_pointLayer); }    catch(e) {}; _pointLayer = null; }
      try { _leafletMap.remove(); _leafletMap = null; } catch(e) {}
      _mapReady = false;
    },
    resize: function() {
      try { if (_leafletMap) _leafletMap.invalidateSize(); } catch(e) {}
    },
  };
}

// ============================================================
//  ★ 年份切换 — 不销毁 Leaflet 实例，仅增量更换 GeoJSON + 散点
// ============================================================
async function switchMapYear(yearData) {
  if (!_leafletMap || !_mapReady) {
    console.warn("[map] Map not ready — call renderMapChart first");
    return;
  }

  var districtData = yearData.district_all;
  var points       = yearData.points;
  if (!districtData && !points) return;

  // 显示短暂加载提示
  var container = document.getElementById("chartMap");
  var flashEl = null;
  if (container) {
    flashEl = document.createElement("div");
    flashEl.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "z-index:1000;background:rgba(51,102,204,0.85);color:#fff;" +
      "padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;" +
      "box-shadow:0 2px 12px rgba(0,0,0,0.2);pointer-events:none;" +
      "transition:opacity .4s ease;";
    flashEl.textContent = "🔄 Updating...";
    container.appendChild(flashEl);
  }

  // 确保 GeoJSON 已缓存
  var geoJson = await _loadUKGeoJSON();
  if (!geoJson) return;

  // 1) 更换热力层
  if (districtData) {
    var mapData = _matchRegions(districtData, geoJson);
    var dataMin = mapData.length ? Math.min.apply(null, mapData.map(function(d){return d.value;})) : 0;
    var dataMax = mapData.length ? Math.max.apply(null, mapData.map(function(d){return d.value;})) : 1;
    var getHeatColor = _makeGetHeatColor(dataMin, dataMax);

    if (_geoJsonLayer) {
      try { _leafletMap.removeLayer(_geoJsonLayer); } catch(e) {}
    }
    _geoJsonLayer = _buildGeoJsonLayer(geoJson, mapData, getHeatColor).addTo(_leafletMap);

    // 标签不变（区域名称不变），但图例更新
    _addLegend(dataMin, dataMax);
  }

  // 2) 更换散点层（点内已自带完整详情数据）
  if (points) {
    _renderPointLayer(points);
  }

  try { _leafletMap.invalidateSize(); } catch(e) {}

  // 渐隐加载提示
  if (flashEl && flashEl.parentNode) {
    flashEl.style.opacity = "0";
    setTimeout(function() {
      if (flashEl.parentNode) flashEl.parentNode.removeChild(flashEl);
    }, 500);
  }

  console.log("[map] Year switched — Leaflet instance reused, no tile flicker");
}

// ============================================================
//  window API（main.js 调用）
// ============================================================
window.renderMapChart   = renderMapChart;
window.switchMapYear    = switchMapYear;
window.refreshMapOverlay = switchMapYear;  // 向后兼容
