/* ============================================================
   hourlyDetail.js — 24小时分布下钻详情
   触发：点击 24-Hour Distribution 柱状图
   显示：严重程度环形 + 车辆类型 + 工作日分布
   ============================================================ */

function renderHourlyDetail(data) {
  disposeDetailCharts();
  var d = detailCharts;

  // 子图1: 严重程度环形
  var c1 = initChartDom("detailChart1");
  if (c1 && data.severity) {
    var colors = [PALETTE.severity.Fatal, PALETTE.severity.Serious, PALETTE.severity.Slight];
    c1.setOption({
      title: { text: "Severity Breakdown", left:8, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      legend: { orient:"vertical", right:4, top:28, itemWidth:8,itemHeight:8, textStyle:{fontSize:9} },
      tooltip: { trigger:"item", formatter:function(p){ return tooltipHTML(p.name, [{label:"Count",value:fmt(p.value),color:colors[p.dataIndex]},{label:"Percent",value:p.percent.toFixed(1)+"%"} ]); }},
      series: [{ type:"pie", radius:["40%","62%"], center:["38%","55%"], itemStyle:{borderColor:"transparent",borderWidth:2,borderRadius:2}, label:{fontSize:8}, data: data.severity.map(function(d,i){ return {name:d.severity_label,value:d.count,itemStyle:{color:colors[i]}}; }) }],
    });
    d.push(c1);
  }

  // 子图2: 车辆类型 TOP5
  var c2 = initChartDom("detailChart2");
  if (c2 && data.vehicle) {
    var top = data.vehicle.sort(function(a,b){return b.count - a.count;}).slice(0,5);
    c2.setOption({
      title: { text: "Top 5 Vehicle Types", left:10, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      grid: { top:30, right:50, bottom:6, left:90 },
      tooltip: { trigger:"axis", axisPointer:{type:"shadow"}, formatter:function(p){ return tooltipHTML(p[0].name, [{label:"Vehicles",value:fmt(p[0].value)}]); }},
      xAxis: { type:"value", axisLabel:{fontSize:8,formatter:function(v){return (v/1000000).toFixed(1)+"M";}}, splitLine:{lineStyle:{type:"dashed",color:"#f0f0f6"}} },
      yAxis: { type:"category", data: top.map(function(d){return d.vehicle_label;}), inverse:true, axisLabel:{fontSize:9}, axisTick:{show:false}, axisLine:{show:false} },
      series: [{ type:"bar", data: top.map(function(d,i){ return { value:d.count, itemStyle:{color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:PALETTE.vehicleColors[i]},{offset:1,color:PALETTE.vehicleColors[i]+"66"}]), borderRadius:[0,3,3,0]} }; }), barMaxWidth:12, label:{show:true,position:"right",fontSize:8,formatter:function(p){return fmt(p.value);}} }],
    });
    d.push(c2);
  }

  // 子图3: 工作日分布
  var c3 = initChartDom("detailChart3");
  if (c3 && data.daily) {
    var order = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var map = {}; data.daily.forEach(function(d){map[d.day_label]=d.count;});
    var dl = order.map(function(d){return d.substring(0,3);});
    var dv = order.map(function(d){return map[d]||0;});
    c3.setOption({
      title: { text: "Day of Week", left:10, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      grid: { top:30, right:10, bottom:18, left:40 },
      tooltip: { trigger:"axis" },
      xAxis: { type:"category", data:dl, axisLabel:{fontSize:9}, axisTick:{show:false} },
      yAxis: { type:"value", axisLabel:{fontSize:8,formatter:function(v){return (v/1000).toFixed(0)+"k";}}, splitLine:{lineStyle:{type:"dashed",color:"#f0f0f6"}} },
      series: [{ type:"line", data:dv, smooth:.35, symbol:"circle", symbolSize:4, lineStyle:{color:PALETTE.accent,width:2}, itemStyle:{color:PALETTE.accent}, areaStyle:{color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:"rgba(51,102,204,.18)"},{offset:1,color:"rgba(51,102,204,.02)"}])} }],
    });
    d.push(c3);
  }
}
