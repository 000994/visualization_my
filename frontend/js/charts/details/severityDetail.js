/* ============================================================
   severityDetail.js — 事故严重程度下钻详情（3个子图表）
   触发：点击 Severity Distribution 环形图
   显示：车辆类型水平条 + 24h柱状 + 地区TOP10
   ============================================================ */

var detailCharts = []; // 详情面板内的图表实例（用于销毁）

/**
 * 渲染严重程度下钻详情
 * @param {Object} data — { vehicle, hourly, district }
 */
function renderSeverityDetail(data) {
  disposeDetailCharts();
  var d = detailCharts;

  // 子图1: 车辆类型 TOP6 水平条
  var c1 = initChartDom("detailChart1");
  if (c1) {
    var sorted = (data.vehicle || []).sort(function(a,b){return b.count - a.count;}).slice(0,6);
    c1.setOption({
      title: { text: "Vehicle Types Involved", left:10, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      grid: { top:30, right:50, bottom:6, left:100 },
      tooltip: { trigger:"axis", axisPointer:{type:"shadow"}, formatter: function(p){ return tooltipHTML(p[0].name, [{label:"Vehicles",value:fmt(p[0].value)}]); }},
      xAxis: { type:"value", axisLabel:{fontSize:9,formatter:function(v){return (v/1000).toFixed(0)+"k";}}, splitLine:{lineStyle:{type:"dashed",color:"#f0f0f6"}} },
      yAxis: { type:"category", data: sorted.map(function(d){return d.vehicle_label;}), inverse:true, axisLabel:{fontSize:9}, axisTick:{show:false}, axisLine:{show:false} },
      series: [{ type:"bar", data: sorted.map(function(d,i){ return { value:d.count, itemStyle:{color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:PALETTE.vehicleColors[i]||PALETTE.accent},{offset:1,color:(PALETTE.vehicleColors[i]||PALETTE.accent)+"66"}]), borderRadius:[0,4,4,0]} }; }), barMaxWidth:14, label:{show:true,position:"right",fontSize:8,formatter:function(p){return fmt(p.value);}} }],
    });
    d.push(c1);
  }

  // 子图2: 24h柱状
  var c2 = initChartDom("detailChart2");
  if (c2 && data.hourly) {
    var sortedH = data.hourly.sort(function(a,b){return a.hour - b.hour;});
    var hrs = sortedH.map(function(d){return String(Math.round(d.hour)).padStart(2,"0")+":00";});
    var vals = sortedH.map(function(d){return d.count;});
    var mx = Math.max.apply(null, vals);
    c2.setOption({
      title: { text: "24-Hour Distribution", left:10, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      grid: { top:30, right:8, bottom:18, left:40 },
      tooltip: { trigger:"axis", axisPointer:{type:"shadow"} },
      xAxis: { type:"category", data:hrs, axisLabel:{fontSize:7,rotate:45,interval:2}, axisTick:{show:false} },
      yAxis: { type:"value", axisLabel:{fontSize:8,formatter:function(v){return (v/1000).toFixed(0)+"k";}}, splitLine:{lineStyle:{type:"dashed",color:"#f0f0f6"}} },
      series: [{ type:"bar", data: vals.map(function(v){ return { value:v, itemStyle:{ color: v/mx>=.8?PALETTE.hourlyPeak:v/mx>=.5?PALETTE.hourlyHigh:v/mx>=.25?PALETTE.hourlyNormal:PALETTE.hourlyLow, borderRadius:[2,2,0,0] } }; }), barMaxWidth:10 }],
    });
    d.push(c2);
  }

  // 子图3: 地区 TOP10
  var c3 = initChartDom("detailChart3");
  if (c3 && data.district) {
    var top = data.district.slice(0,10);
    c3.setOption({
      title: { text: "District TOP 10", left:10, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      grid: { top:30, right:50, bottom:6, left:100 },
      tooltip: { trigger:"axis", axisPointer:{type:"shadow"}, formatter: function(p){ return tooltipHTML(p[0].name, [{label:"Accidents",value:fmt(p[0].value)}]); }},
      xAxis: { type:"value", axisLabel:{fontSize:9,formatter:function(v){return (v/1000).toFixed(0)+"k";}}, splitLine:{lineStyle:{type:"dashed",color:"#f0f0f6"}} },
      yAxis: { type:"category", data: top.map(function(d){return d.district_label;}), inverse:true, axisLabel:{fontSize:9}, axisTick:{show:false}, axisLine:{show:false} },
      series: [{ type:"bar", data: top.map(function(d,i){ return { value:d.count, itemStyle:{color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:"#3366cc"},{offset:1,color:"#3366cc66"}]), borderRadius:[0,4,4,0]} }; }), barMaxWidth:12, label:{show:true,position:"right",fontSize:8,formatter:function(p){return fmt(p.value);}} }],
    });
    d.push(c3);
  }
}

function disposeDetailCharts() {
  detailCharts.forEach(function(c){ try { c.dispose(); } catch(e){} });
  detailCharts = [];
}
