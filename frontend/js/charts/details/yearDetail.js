/* ============================================================
   yearDetail.js — 年度趋势下钻详情
   触发：点击 Annual Trend 折线图
   显示：年度×严重程度 + 月度热力 + 光照条件
   ============================================================ */

function renderYearDetail(data) {
  disposeDetailCharts();
  var d = detailCharts;

  // 子图1: 年度 × 严重程度（多线）
  var c1 = initChartDom("detailChart1");
  if (c1 && data.yearlySeverity) {
    var years = []; var fatal = []; var serious = []; var slight = [];
    var map = {};
    data.yearlySeverity.forEach(function(r){
      if (!map[r.year]) map[r.year] = {};
      map[r.year][r.severity_label] = r.count;
    });
    Object.keys(map).sort().forEach(function(y){
      years.push(y);
      fatal.push(map[y]["Fatal"]||0);
      serious.push(map[y]["Serious"]||0);
      slight.push(map[y]["Slight"]||0);
    });
    c1.setOption({
      title: { text: "Yearly × Severity", left:10, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      legend: { bottom:0, itemWidth:8,itemHeight:8, textStyle:{fontSize:9} },
      grid: { top:30, right:8, bottom:30, left:42 },
      tooltip: { trigger:"axis" },
      xAxis: { type:"category", data:years, axisLabel:{fontSize:7,rotate:30}, axisTick:{show:false} },
      yAxis: { type:"value", axisLabel:{fontSize:8,formatter:function(v){return (v/1000).toFixed(0)+"k";}}, splitLine:{lineStyle:{type:"dashed",color:"#f0f0f6"}} },
      series: [
        { name:"Fatal", type:"line", data:fatal, smooth:.3, symbol:"none", lineStyle:{color:PALETTE.severity.Fatal,width:2}, areaStyle:{color:"rgba(229,57,53,.1)"} },
        { name:"Serious", type:"line", data:serious, smooth:.3, symbol:"none", lineStyle:{color:PALETTE.severity.Serious,width:2}, areaStyle:{color:"rgba(251,140,0,.1)"} },
        { name:"Slight", type:"line", data:slight, smooth:.3, symbol:"none", lineStyle:{color:PALETTE.severity.Slight,width:2}, areaStyle:{color:"rgba(67,160,71,.1)"} },
      ],
    });
    d.push(c1);
  }

  // 子图2: 光照条件
  var c2 = initChartDom("detailChart2");
  if (c2 && data.lightCond) {
    var sorted = data.lightCond.sort(function(a,b){return b.count - a.count;});
    var lightColors = {"Daylight":"#ffc107","Darkness - lights lit":"#3b9eff","Darkness - no lighting":"#1a237e","Darkness - lighting unknown":"#546e7a","Darkness - lights unlit":"#37474f"};
    c2.setOption({
      title: { text: "Light Conditions", left:10, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      grid: { top:30, right:8, bottom:18, left:60 },
      tooltip: { trigger:"axis", axisPointer:{type:"shadow"} },
      xAxis: { type:"category", data: sorted.map(function(d){return d.light_label;}), axisLabel:{fontSize:6,rotate:20}, axisTick:{show:false} },
      yAxis: { type:"value", axisLabel:{fontSize:8,formatter:function(v){return (v/1000000).toFixed(1)+"M";}}, splitLine:{lineStyle:{type:"dashed",color:"#f0f0f6"}} },
      series: [{ type:"bar", data: sorted.map(function(d){ return { value:d.count, itemStyle:{color:lightColors[d.light_label]||PALETTE.accent,borderRadius:[3,3,0,0]} }; }), barMaxWidth:24 }],
    });
    d.push(c2);
  }

  // 子图3: 道路类型
  var c3 = initChartDom("detailChart3");
  if (c3 && data.roadType) {
    var sortedR = data.roadType.sort(function(a,b){return b.count - a.count;});
    c3.setOption({
      title: { text: "Road Type Distribution", left:10, top:4, textStyle:{fontSize:12,color:"#5a5a7a"} },
      grid: { top:30, right:50, bottom:6, left:100 },
      tooltip: { trigger:"axis", axisPointer:{type:"shadow"}, formatter:function(p){ return tooltipHTML(p[0].name,[{label:"Accidents",value:fmt(p[0].value)}]); }},
      xAxis: { type:"value", axisLabel:{fontSize:8}, splitLine:{lineStyle:{type:"dashed",color:"#f0f0f6"}} },
      yAxis: { type:"category", data: sortedR.map(function(d){return d.road_label;}), inverse:true, axisLabel:{fontSize:9}, axisTick:{show:false}, axisLine:{show:false} },
      series: [{ type:"bar", data: sortedR.map(function(d,i){ return { value:d.count, itemStyle:{color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:PALETTE.roadGradient[i%6]||PALETTE.accent},{offset:1,color:(PALETTE.roadGradient[i%6]||PALETTE.accent)+"66"}]), borderRadius:[0,4,4,0]} }; }), barMaxWidth:16, label:{show:true,position:"right",fontSize:8,formatter:function(p){return fmt(p.value);}} }],
    });
    d.push(c3);
  }
}
