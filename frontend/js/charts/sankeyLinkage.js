/* ============================================================
   sankeyLinkage.js — 桑基图联动管理模块
   职责：管理筛选状态、节点选中状态、跨图表联动触发
   纯逻辑层，不碰现有 sankeyChart.js 渲染函数
   ============================================================ */

var SankeyLinkage = (function() {

  // ---- 状态 ----
  var _filterType = "all";         // "all" | "fatal" | "night"
  var _selectedNode = null;        // { name: string, category: string } | null
  var _debounceTimer = null;

  // 暗夜光照关键词
  var NIGHT_LIGHT_LABELS = [
    "Darkness - no lighting",
    "Darkness - lights unlit",
    "Darkness - lights lit",
    "Darkness - lighting unknown",
  ];

  // ============================================================
  //  筛选 → 过滤桑基图数据
  // ============================================================
  function getFilteredSankeyData(baseData, filterType) {
    if (filterType === "all" || !baseData) return baseData;

    var filtered = JSON.parse(JSON.stringify(baseData)); // 浅克隆
    var validSources = new Set();

    if (filterType === "fatal") {
      // 只保留流向 Fatal 的链接 + 相关节点
      filtered.links = filtered.links.filter(function(l) {
        return l.target === "Fatal";
      });
    } else if (filterType === "night") {
      // 只保留夜间光照节点发出的链接
      filtered.links = filtered.links.filter(function(l) {
        return NIGHT_LIGHT_LABELS.indexOf(l.source) >= 0;
      });
    }

    // 收集所有有效 source/target
    filtered.links.forEach(function(l) {
      validSources.add(l.source);
      validSources.add(l.target);
    });

    // 过滤节点
    filtered.nodes = filtered.nodes.filter(function(n) {
      return validSources.has(n.name);
    });

    // 重算 value
    var nodeTotals = {};
    filtered.links.forEach(function(l) {
      nodeTotals[l.source] = (nodeTotals[l.source] || 0) + l.value;
      nodeTotals[l.target] = (nodeTotals[l.target] || 0) + l.value;
    });
    filtered.nodes.forEach(function(n) {
      n.value = nodeTotals[n.name] || 0;
    });

    return filtered;
  }

  // ============================================================
  //  获取节点选中状态下过滤后的散点数据
  // ============================================================
  function getFilteredPoints(points, selectedNode) {
    if (!selectedNode || !points || !points.length) return null;

    var name = selectedNode.name;
    var cat = _getNodeCategory(name);

    // 根据节点的 category 决定过滤字段
    var filterField = null;
    if (cat === "light") filterField = "light_label";
    else if (cat === "severity") filterField = "severity_label";
    else if (cat === "vehicle") filterField = "road_label";  // 近似
    else return null;

    var matched = [];
    var unmatched = [];

    points.forEach(function(p) {
      var pVal = p[filterField] || "";
      // 车辆类型可能需要模糊匹配
      var isMatch = false;
      if (cat === "vehicle") {
        isMatch = pVal.toLowerCase().indexOf(name.toLowerCase()) >= 0;
      } else {
        isMatch = pVal === name;
      }

      if (isMatch) {
        matched.push(p);
      } else {
        unmatched.push(p);
      }
    });

    return { matched: matched, unmatched: unmatched };
  }

  // ============================================================
  //  获取节点选中状态下的 TOP10 地区
  // ============================================================
  function getFilteredDistrict(districtData, points, selectedNode) {
    if (!selectedNode || !points || !points.length) return districtData;

    var result = getFilteredPoints(points, selectedNode);
    if (!result || !result.matched.length) return districtData;

    // 统计各地区的匹配散点数量
    var districtCounts = {};
    result.matched.forEach(function(p) {
      var d = p.district_label || "Unknown";
      districtCounts[d] = (districtCounts[d] || 0) + 1;
    });

    // 排序取 TOP10
    var sorted = Object.keys(districtCounts).map(function(d) {
      return { district_label: d, count: districtCounts[d] };
    });
    sorted.sort(function(a, b) { return b.count - a.count; });

    return sorted.slice(0, 10);
  }

  // ============================================================
  //  工具函数：判断节点属于哪个类别
  // ============================================================
  function _getNodeCategory(nodeName) {
    // 光照条件
    if (nodeName.indexOf("Darkness") === 0 || nodeName === "Daylight") {
      return "light";
    }
    // 严重程度
    if (nodeName === "Fatal" || nodeName === "Serious" || nodeName === "Slight") {
      return "severity";
    }
    // 其余的为车辆类型
    return "vehicle";
  }

  // ============================================================
  //  获取当前筛选类型
  // ============================================================
  function getFilterType() {
    return _filterType;
  }

  function setFilterType(type) {
    _filterType = type;
  }

  function getSelectedNode() {
    return _selectedNode;
  }

  function setSelectedNode(node) {
    _selectedNode = node;
  }

  function getNightLabels() {
    return NIGHT_LIGHT_LABELS;
  }

  // 暴露到全局
  window.SankeyLinkage = {
    getFilteredSankeyData: getFilteredSankeyData,
    getFilteredPoints: getFilteredPoints,
    getFilteredDistrict: getFilteredDistrict,
    getNodeCategory: _getNodeCategory,
    getFilterType: getFilterType,
    setFilterType: setFilterType,
    getSelectedNode: getSelectedNode,
    setSelectedNode: setSelectedNode,
    getNightLabels: getNightLabels,
  };

  return {
    getFilteredSankeyData: getFilteredSankeyData,
    getFilteredPoints: getFilteredPoints,
    getFilteredDistrict: getFilteredDistrict,
    getNodeCategory: _getNodeCategory,
    getFilterType: getFilterType,
    setFilterType: setFilterType,
    getSelectedNode: getSelectedNode,
    setSelectedNode: setSelectedNode,
    getNightLabels: getNightLabels,
  };

})();
