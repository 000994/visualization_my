/* ============================================================
   vehicleDetail.js — 车辆类型下钻详情
   触发：点击 Vehicle Types 水平条
   显示：严重程度 + 24h + 城乡对比
   ============================================================ */

function renderVehicleDetail(data) {
  disposeDetailCharts();
  var d = detailCharts;

  // 子图1: 严重程度分布（小柱状）
  var c1 = initChartDom("detailChart1");
  if (c1 && data.severity) {
    var colors = [PALETTE.severity.Fatal, PALETTE.severity.Serious, PALETTE.severity.Slight];
    c1.setOption({
      title: { text: "Severity Distribution", left:10, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      grid: { top:30, right:8, bottom:18, left:42 },
      tooltip: { trigger:"axis", axisPointer:{type:"shadow"}, formatter:function(p){ return tooltipHTML(p[0].name, [{label:"Count",value:fmt(p[0].value),color:colors[p[0].dataIndex]}]); }},
      xAxis: { type:"category", data: data.severity.map(function(d){return d.severity_label;}), axisLabel:{fontSize:9}, axisTick:{show:false} },
      yAxis: { type:"value", axisLabel:{fontSize:8,formatter:function(v){return (v/1000).toFixed(0)+"k";}}, splitLine:{lineStyle:{type:"dashed",color:"#f0f0f6"}} },
      series: [{ type:"bar", data: data.severity.map(function(d,i){ return { value:d.count, itemStyle:{color:colors[i],borderRadius:[4,4,0,0]} }; }), barMaxWidth:32, label:{show:true,position:"top",fontSize:9,formatter:function(p){return fmt(p.value);}} }],
    });
    d.push(c1);
  }

  // 子图2: 24h 分布
  var c2 = initChartDom("detailChart2");
  if (c2 && data.hourly) {
    var sorted = data.hourly.sort(function(a,b){return a.hour - b.hour;});
    var hrs = sorted.map(function(d){return String(Math.round(d.hour)).padStart(2,"0")+":00";});
    var vals = sorted.map(function(d){return d.count;});
    var mx = Math.max.apply(null, vals);
    c2.setOption({
      title: { text: "24-Hour Distribution", left:10, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      grid: { top:30, right:8, bottom:18, left:38 },
      tooltip: { trigger:"axis", axisPointer:{type:"shadow"} },
      xAxis: { type:"category", data:hrs, axisLabel:{fontSize:6,rotate:45,interval:2}, axisTick:{show:false} },
      yAxis: { type:"value", axisLabel:{fontSize:7,formatter:function(v){return (v/1000).toFixed(0)+"k";}}, splitLine:{lineStyle:{type:"dashed",color:"#f0f0f6"}} },
      series: [{ type:"bar", data: vals.map(function(v){ return { value:v, itemStyle:{ color: v/mx>=.8?PALETTE.hourlyPeak:v/mx>=.5?PALETTE.hourlyHigh:v/mx>=.25?PALETTE.hourlyNormal:PALETTE.hourlyLow, borderRadius:[2,2,0,0] } }; }), barMaxWidth:10 }],
    });
    d.push(c2);
  }

  // 子图3: 城乡对比
  var c3 = initChartDom("detailChart3");
  if (c3 && data.urbanRural) {
    var colors3 = {Urban:"#42a5f5",Rural:"#ab47bc",Unallocated:"#78909c"};
    c3.setOption({
      title: { text: "Urban vs Rural", left:10, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      legend: { orient:"vertical", right:4, top:28, itemWidth:8,itemHeight:8, textStyle:{fontSize:9} },
      tooltip: { trigger:"item", formatter:function(p){ return tooltipHTML(p.name, [{label:"Count",value:fmt(p.value)},{label:"Percent",value:p.percent.toFixed(1)+"%"} ]); }},
      series: [{ type:"pie", radius:["42%","64%"], center:["38%","55%"], itemStyle:{borderColor:"transparent",borderWidth:2,borderRadius:2}, label:{fontSize:8}, data: data.urbanRural.map(function(d){ return {name:d.urban_rural_label,value:d.count,itemStyle:{color:colors3[d.urban_rural_label]||PALETTE.accent}}; }) }],
    });
    d.push(c3);
  }
}
