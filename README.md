# UK Car Accidents 2005-2015 Visualization

这是一个基于英国交通事故数据的交互式数据可视化页面。页面以一屏仪表盘的形式展示 2005-2015 年事故数量、伤亡、时间分布、道路类型、城乡变化、天气/光照/车辆流向和地图空间分布。

## 页面功能

- **顶部统计卡片**
  - 展示事故总数、致命事故数、伤亡人数和事故高峰小时。
  - 右上角可切换 `Light/Dark` 主题。
  - `Independent/Global` 开关用于控制年份选择器是否联动。

- **左侧 Sankey 流向图**
  - 展示 `Weather -> Light -> Vehicle` 的事故关联流向。
  - 可通过年份选择器查看不同年份的数据。
  - 点击节点会联动地图上的事故点高亮。

- **左下 Calendar Heatmap**
  - 展示不同月份和周次的事故热力分布。
  - 可选择年份查看该年份日历聚合情况。

- **中间 UK Overview Map**
  - 展示英国区域事故分布和抽样事故点。
  - 地图年份选择器支持 `All Years` 和 2005-2015 单一年份。
  - 点击地图区域后，右侧三个图会切换为该区域画像。
  - 点击事故点可查看该事故的时间、道路类型、光照、天气、伤亡、车辆数等详情。
  - 点击 `Reset` 可回到全英国视角。

- **右上 Multi-Dimension Radar**
  - 展示事故结构维度，包括严重程度、道路类型、城乡区域和光照条件。
  - 右上角下拉框可切换维度。
  - 当前版本不再提供雷达图 detail 面板。

- **右中 24-Hour Distribution**
  - 展示一天 24 小时内事故数量分布。
  - 图中标注峰值小时、平均每小时事故线，并用背景区分 Night / Morning / Afternoon / Evening。
  - hover 可查看事故数、占总量比例和 Fatal / Serious / Slight 拆分。
  - 打开 `Detail` 后包含：
    - 小时分布柱状图
    - 夜间/上午/下午/傍晚分段占比
    - 严重程度上下文图

- **右下 Urban / Rural YoY Change**
  - 展示城市和乡村事故数量的年度变化趋势。
  - 打开 `Detail` 后可查看城乡趋势、同比变化和当前年份城乡占比。

## 基本操作

1. **切换年份**
   - 地图、日历和 Sankey 图各自有年份选择器。
   - 默认 `Independent` 模式下，各图年份独立切换。
   - 切到 `Global` 模式后，改变任一年份选择器会同步其它年份选择器，并刷新右侧区域画像。

2. **查看区域画像**
   - 在地图上点击一个区域。
   - 右侧雷达图、24 小时分布图、城乡变化图会切换为该区域数据。
   - 地图顶部会显示当前区域和年份。
   - 点击 `Reset` 取消区域选择。

3. **查看详细面板**
   - 右侧 `24-Hour Distribution` 和 `Urban / Rural YoY Change` 面板右上角有 `Detail` 按钮。
   - 点击后右下角会弹出可拖拽、可缩放的 detail 面板。
   - 按 `Esc` 或点击面板右上角关闭按钮可关闭 detail 面板。

4. **查看事故点详情**
   - 在地图上点击事故散点。
   - 弹窗会展示事故严重程度、日期时间、道路类型、光照条件、速度限制、车辆数、伤亡数等信息。

5. **切换主题**
   - 点击页面右上角 `Dark` / `Light` 按钮切换浅色和深色主题。

## 运行方式

项目是静态前端页面，但由于页面使用 `fetch` 加载 JSON 数据，建议通过本地 HTTP 服务打开。

```powershell
cd "D:\自用\学习\大三下\数据可视化\visualization\frontend"
python -m http.server 8765
```

然后在浏览器打开：

```text
http://localhost:8765/
```

注意：页面通过 CDN 加载 ECharts 和 Leaflet。如果浏览器无法访问外网，图表库或地图底图可能无法正常加载。

## 数据预处理

如果原始 CSV 数据或预处理逻辑发生变化，需要重新生成 `frontend/data/` 下的 JSON 文件。

```powershell
cd "D:\自用\学习\大三下\数据可视化\visualization"
python preprocess.py
```

预处理脚本会读取：

- `data/Accidents0515.csv`
- `data/Casualties0515.csv`
- `data/Vehicles0515.csv`
- `data/contextCSVs/` 下的编码映射表

主要输出到：

- `frontend/data/global_charts_data.json`
- `frontend/data/map_yearly_data.json`
- `frontend/data/sankey_data.json`
- `frontend/data/arc_flow_data.json`
- `frontend/data/region_profiles.json`
- 以及若干兼容用的小型分布 JSON

## 项目结构

```text
visualization/
├─ preprocess.py                 # 数据预处理脚本
├─ data/                         # 原始 CSV 和编码映射表
├─ frontend/
│  ├─ index.html                 # 页面入口
│  ├─ css/style.css              # 页面样式和主题
│  ├─ data/                      # 预处理后生成的 JSON 数据
│  └─ js/
│     ├─ main.js                 # 数据加载、全局初始化、联动逻辑
│     ├─ detailsPanel.js         # detail 面板打开/关闭/拖拽/缩放
│     ├─ regionState.js          # 地图区域和年份选择状态
│     ├─ globalYearFilter.js     # Independent/Global 年份联动
│     └─ charts/                 # 各图表渲染代码
```

## 当前说明

- 雷达图只作为右侧概览图使用，不再提供 detail 面板。
- 24 小时图的 detail 第三块为严重程度上下文图。
- 地图散点为抽样数据，用于保持页面性能，不代表完整事故点全部逐点绘制。
