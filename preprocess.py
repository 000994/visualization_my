"""
UK Car Accidents 2005-2015 — 数据预处理脚本
读取三张主表 + 编码映射表，将数字编码替换为真实标签，聚合生成可视化所需的小数据，
输出 JSON 文件到 frontend/data/ 目录。
"""

import os
import json
import pandas as pd
import numpy as np

# ============================================================
# 0. 路径配置
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MAPPING_DIR = os.path.join(DATA_DIR, "contextCSVs")
OUTPUT_DIR = os.path.join(BASE_DIR, "frontend", "data")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================================
# 1. 读取所有编码映射表 → {文件名: {code: label}}
# ============================================================
def load_all_mappings(mapping_dir: str) -> dict:
    """遍历 contextCSVs 目录，将每个 CSV 读取为 {code: label} 字典。"""
    mappings = {}
    for fname in os.listdir(mapping_dir):
        if not fname.endswith(".csv"):
            continue
        key = fname.replace(".csv", "")
        df = pd.read_csv(
            os.path.join(mapping_dir, fname),
            encoding="utf-8-sig",
            dtype=str,
        )
        # 统一列名为小写（创建小写列名映射到原始列名）
        df.columns = [c.strip().lower() for c in df.columns]
        code_col = next((c for c in df.columns if "code" in c), df.columns[0])
        label_col = next((c for c in df.columns if "label" in c), df.columns[1])
        # 去首尾空格
        df[code_col] = df[code_col].str.strip()
        df[label_col] = df[label_col].str.strip()
        mappings[key] = dict(zip(df[code_col], df[label_col]))
    return mappings

print("正在读取编码映射表...")
MAPPINGS = load_all_mappings(MAPPING_DIR)
print(f"共加载 {len(MAPPINGS)} 个映射表")

# ============================================================
# 2. 读取三张主表（使用 dype 优化 + 仅读取需要的列以节省内存）
# ============================================================

# ---------- Accidents ----------
acc_cols = [
    "Accident_Index",
    "Accident_Severity",
    "Date",
    "Day_of_Week",
    "Time",
    "Road_Type",
    "Light_Conditions",
    "Urban_or_Rural_Area",
    "Local_Authority_(District)",
    "Longitude",
    "Latitude",
    "Weather_Conditions",
    "Road_Surface_Conditions",
    "Number_of_Casualties",
    "Number_of_Vehicles",
    "Speed_limit",
]
acc_dtypes = {
    "Accident_Index": str,
    "Accident_Severity": str,
    "Date": str,
    "Day_of_Week": str,
    "Time": str,
    "Road_Type": str,
    "Light_Conditions": str,
    "Urban_or_Rural_Area": str,
    "Local_Authority_(District)": str,
    "Longitude": float,
    "Latitude": float,
    "Weather_Conditions": str,
    "Road_Surface_Conditions": str,
    "Number_of_Casualties": float,
    "Number_of_Vehicles": float,
    "Speed_limit": float,
}
print("正在读取 Accidents 表 (约178万行)...")
acc = pd.read_csv(
    os.path.join(DATA_DIR, "Accidents0515.csv"),
    usecols=acc_cols,
    dtype=acc_dtypes,
    encoding="utf-8-sig",
)
print(f"  Accidents: {len(acc):,} 行")

# ---------- Casualties ----------
cas_cols = [
    "Accident_Index",
    "Casualty_Severity",
]
cas_dtypes = {
    "Accident_Index": str,
    "Casualty_Severity": str,
}
print("正在读取 Casualties 表 (约240万行)...")
cas = pd.read_csv(
    os.path.join(DATA_DIR, "Casualties0515.csv"),
    usecols=cas_cols,
    dtype=cas_dtypes,
    encoding="utf-8-sig",
)
print(f"  Casualties: {len(cas):,} 行")

# ---------- Vehicles ----------
veh_cols = [
    "Accident_Index",
    "Vehicle_Type",
]
veh_dtypes = {
    "Accident_Index": str,
    "Vehicle_Type": str,
}
print("正在读取 Vehicles 表 (约326万行)...")
veh = pd.read_csv(
    os.path.join(DATA_DIR, "Vehicles0515.csv"),
    usecols=veh_cols,
    dtype=veh_dtypes,
    encoding="utf-8-sig",
)
print(f"  Vehicles: {len(veh):,} 行")

# ============================================================
# 3. 编码 → 标签替换
# ============================================================
print("正在进行编码→标签映射...")

# 3a. 事故严重程度
if "Accident_Severity" in MAPPINGS:
    acc["severity_label"] = acc["Accident_Severity"].map(MAPPINGS["Accident_Severity"]).fillna("Unknown")

# 3b. 星期
if "Day_of_Week" in MAPPINGS:
    acc["day_label"] = acc["Day_of_Week"].map(MAPPINGS["Day_of_Week"]).fillna("Unknown")

# 3c. 道路类型
if "Road_Type" in MAPPINGS:
    acc["road_label"] = acc["Road_Type"].map(MAPPINGS["Road_Type"]).fillna("Unknown")

# 3d. 光照条件
if "Light_Conditions" in MAPPINGS:
    acc["light_label"] = acc["Light_Conditions"].map(MAPPINGS["Light_Conditions"]).fillna("Unknown")

# 3d2. 天气状况（手动映射，归并为 5 类以对齐 Light/Vehicle 列节点数）
WEATHER_MAP = {
    "1": "Fine",
    "2": "Raining",
    "3": "Snowing",
    "4": "Fog",
    "5": "Other Weather",
    "6": "Other Weather",      # Windy → 合并
    "7": "Other Weather",      # Unknown → 合并
    "8": "Other Weather",
    "9": "Other Weather",
}
acc["weather_label"] = acc["Weather_Conditions"].map(WEATHER_MAP).fillna("Other Weather")

# 3e. 城乡
if "Urban_Rural" in MAPPINGS:
    acc["urban_rural_label"] = acc["Urban_or_Rural_Area"].map(MAPPINGS["Urban_Rural"]).fillna("Unknown")

# 3f. 地区
if "Local_Authority_District" in MAPPINGS:
    acc["district_label"] = acc["Local_Authority_(District)"].map(MAPPINGS["Local_Authority_District"]).fillna("Unknown")

# 3g. 伤亡严重程度
if "Casualty_Severity" in MAPPINGS:
    cas["casualty_severity_label"] = cas["Casualty_Severity"].map(MAPPINGS["Casualty_Severity"]).fillna("Unknown")

# 3h. 车辆类型
if "Vehicle_Type" in MAPPINGS:
    veh["vehicle_label"] = veh["Vehicle_Type"].map(MAPPINGS["Vehicle_Type"]).fillna("Unknown")

# 3i. ★ 车辆大类归并：将 ~20 类零散车型合并为 5 个治理级大类
VEHICLE_CATEGORY_MAP = {
    # — 私家乘用车（保持独立，占事故大头）—
    "Car": "Cars",

    # — 两轮/弱势交通（受光照影响极大）—
    "Pedal cycle":                    "Two-Wheelers",
    "Motorcycle over 500cc":          "Two-Wheelers",
    "Motorcycle 125cc and under":     "Two-Wheelers",
    "Motorcycle 50cc and under":      "Two-Wheelers",
    "Motorcycle over 125cc and up to 500cc": "Two-Wheelers",
    "Motorcycle - unknown cc":        "Two-Wheelers",
    "Electric motorcycle":            "Two-Wheelers",
    "Ridden horse":                   "Two-Wheelers",
    "Mobility scooter":               "Two-Wheelers",

    # — 大型货运车（夜间/疲劳驾驶极易引发 Fatal）—
    "Van / Goods 3.5 tonnes mgw or under": "Heavy Freight",
    "Goods 7.5 tonnes mgw and over":       "Heavy Freight",
    "Goods over 3.5t. and under 7.5t":    "Heavy Freight",
    "Goods vehicle - unknown weight":      "Heavy Freight",

    # — 公共交通 —
    "Bus or coach (17 or more pass seats)": "Public Transport",
    "Taxi/Private hire car":                "Public Transport",
    "Minibus (8 - 16 passenger seats)":    "Public Transport",
    "Tram":                                 "Public Transport",

    # — 其他/特种车 —
    "Other vehicle":            "Others",
    "Agricultural vehicle":     "Others",
    "Data missing or out of range": "Others",
}
veh["vehicle_category"] = veh["vehicle_label"].map(VEHICLE_CATEGORY_MAP).fillna("Others")
print(f"  车辆大类归并: {veh['vehicle_category'].nunique()} 类")
print(f"  各类数量:\n{veh['vehicle_category'].value_counts().to_string()}")

# ============================================================
# 4. 派生列：年份、小时
# ============================================================
print("正在派生时间字段...")
# Date 格式: DD/MM/xxxY
acc["year"] = pd.to_datetime(acc["Date"], format="%d/%m/%Y", errors="coerce").dt.year
# Time 格式: HH:MM
acc["hour"] = pd.to_datetime(acc["Time"], format="%H:%M", errors="coerce").dt.hour
# 过滤无效年份（仅保留 2005–2015）
acc = acc[(acc["year"] >= 2005) & (acc["year"] <= 2015)]
print(f"  有效年份范围: {int(acc['year'].min())} – {int(acc['year'].max())}")

# ============================================================
# 5. 聚合计算
# ============================================================
print("正在进行数据聚合...")

# --- 5a. 年度事故数量趋势 ---
print("  5a. 年度事故数量趋势")
yearly = (
    acc.groupby("year")
    .size()
    .reset_index(name="count")
    .sort_values("year")
)
# 同时按严重程度分组的年度趋势
yearly_severity = (
    acc.groupby(["year", "severity_label"])
    .size()
    .reset_index(name="count")
    .sort_values(["year", "severity_label"])
)

# --- 5b. 24小时事故分布 ---
print("  5b. 24小时事故分布")
hourly = (
    acc.groupby("hour")
    .size()
    .reset_index(name="count")
    .sort_values("hour")
)

# --- 5c. 星期分布 ---
print("  5c. 星期分布")
# 保留原始数值排序
day_order = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
daily = (
    acc.groupby("day_label")
    .size()
    .reset_index(name="count")
)
daily["sort_order"] = daily["day_label"].apply(lambda x: day_order.index(x) if x in day_order else 99)
daily = daily.sort_values("sort_order").drop(columns=["sort_order"])

# --- 5d. 道路类型事故数量 ---
print("  5d. 道路类型事故数量")
road_type = (
    acc.groupby("road_label")
    .size()
    .reset_index(name="count")
    .sort_values("count", ascending=False)
)

# --- 5e. 光照条件事故数量 ---
print("  5e. 光照条件事故数量")
light = (
    acc.groupby("light_label")
    .size()
    .reset_index(name="count")
    .sort_values("count", ascending=False)
)

# --- 5f. 车辆类型事故数量 ---
print("  5f. 车辆类型事故数量")
vehicle_type = (
    veh.groupby("vehicle_label")
    .size()
    .reset_index(name="count")
    .sort_values("count", ascending=False)
)

# --- 5g. 事故严重程度统计 ---
print("  5g. 事故严重程度统计")
severity = (
    acc.groupby("severity_label")
    .size()
    .reset_index(name="count")
    .sort_values("count", ascending=False)
)
severity["percentage"] = (severity["count"] / severity["count"].sum() * 100).round(2)

# --- 5h. 城市 vs 乡村事故分布 ---
print("  5h. 城市 vs 乡村事故分布")
urban_rural = (
    acc.groupby("urban_rural_label")
    .size()
    .reset_index(name="count")
    .sort_values("count", ascending=False)
)
urban_rural["percentage"] = (urban_rural["count"] / urban_rural["count"].sum() * 100).round(2)

# --- 5i. 各地区事故 TOP10 ---
print("  5i. 各地区事故 TOP10")
district = (
    acc.groupby("district_label")
    .size()
    .reset_index(name="count")
    .sort_values("count", ascending=False)
)

# ============================================================
# 6. 组装输出 → JSON（重构：不再生成 279 个 filter_cache 组合）
#    改为两个文件：
#      global_charts_data.json  — 全量聚合（~几百KB）
#      map_yearly_data.json     — 按年份拆分的地图数据（~几MB）
# ============================================================
print("正在输出 JSON 文件...")

# ---- 替换 JSON 输出中的 NaN 为 null ----
def clean_for_json(obj):
    """递归替换 NaN/Inf/-Inf 为 None"""
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    return obj

def build_detailed_points(sub_acc, max_points=2000):
    """从子数据集中抽样事故坐标点，嵌入完整详情属性。
       每个 point 自身携带 12+ 字段，供地图散点点击直接读取，
       消除后端分离 detail_points + 前端 O(n) 扫描。
    """
    detail_cols = ["Longitude", "Latitude", "severity_label"]
    extra_cols  = ["Date", "Time", "Number_of_Casualties", "Number_of_Vehicles",
                   "Weather_Conditions", "Road_Surface_Conditions",
                   "Speed_limit", "light_label", "road_label",
                   "urban_rural_label", "day_label", "district_label"]
    for c in extra_cols:
        if c in sub_acc.columns:
            detail_cols.append(c)

    pts = sub_acc[detail_cols].dropna(subset=["Longitude", "Latitude"])
    if "Time" in pts.columns:
        pts = pts[pts["Time"].notna()]
    if len(pts) > max_points:
        pts = pts.sample(n=max_points, random_state=42)
    # 双序列化确保 NaN/Inf 转为 null
    return json.loads(json.dumps(pts.to_dict(orient="records"), default=lambda x: None))

def build_radar(sub_acc):
    """构建雷达图所需的各维度归一化数据"""
    radar = {}
    # 严重程度计数
    sev_group = sub_acc.groupby("severity_label").size()
    radar["severity"] = {
        "Fatal": int(sev_group.get("Fatal", 0)),
        "Serious": int(sev_group.get("Serious", 0)),
        "Slight": int(sev_group.get("Slight", 0)),
    }
    radar["road_type"] = {
        row["road_label"]: int(row["count"])
        for _, row in sub_acc.groupby("road_label").size().reset_index(name="count").iterrows()
    }
    radar["urban_rural"] = {
        row["urban_rural_label"]: int(row["count"])
        for _, row in sub_acc.groupby("urban_rural_label").size().reset_index(name="count").iterrows()
    }
    radar["light"] = {
        row["light_label"]: int(row["count"])
        for _, row in sub_acc.groupby("light_label").size().reset_index(name="count").iterrows()
    }
    return radar

def build_calendar(sub_acc):
    """构建日历热力图数据（按年-月-周聚合）"""
    cal = sub_acc.copy()
    cal["date"] = pd.to_datetime(cal["Date"], format="%d/%m/%Y", errors="coerce")
    cal["month"] = cal["date"].dt.month
    cal["day_of_month"] = cal["date"].dt.day
    cal["week_of_month"] = ((cal["day_of_month"] - 1) // 7 + 1).clip(upper=5)

    def _agg_cal(group_cols, val_col=None):
        if val_col:
            result = cal.groupby(group_cols)[val_col].sum().reset_index(name="count")
        else:
            result = cal.groupby(group_cols).size().reset_index(name="count")
        result["year"] = result["year"].astype(int)
        result["month"] = result["month"].astype(int)
        result["week_of_month"] = result["week_of_month"].astype(int)
        return result.to_dict(orient="records")

    return {
        "total": _agg_cal(["year", "month", "week_of_month"]),
        "fatal": _agg_cal(["year", "month", "week_of_month"]) if not cal[cal["Accident_Severity"] == "1"].empty else [],
        "casualties": _agg_cal(["year", "month", "week_of_month"], "Number_of_Casualties"),
    }

def build_arc_flow(sub_acc):
    """构建城乡弧长图数据"""
    arc_df = sub_acc.groupby(["year", "urban_rural_label"]).size().reset_index(name="count")
    arc_df = arc_df.sort_values(["year", "urban_rural_label"])
    urban_series = arc_df[arc_df["urban_rural_label"] == "Urban"][["year", "count"]].rename(columns={"count": "urban"})
    rural_series = arc_df[arc_df["urban_rural_label"] == "Rural"][["year", "count"]].rename(columns={"count": "rural"})
    arc_merged = urban_series.merge(rural_series, on="year", how="outer").fillna(0)
    for col in ["urban", "rural"]:
        arc_merged[col] = arc_merged[col].astype(int)
    arc_merged["year"] = arc_merged["year"].astype(int)
    arc_merged["urban_delta"] = arc_merged["urban"].diff().fillna(0).astype(int)
    arc_merged["rural_delta"] = arc_merged["rural"].diff().fillna(0).astype(int)
    return arc_merged.to_dict(orient="records")

REGION_KEYWORDS = {
    "Scotland":["scotland","glasgow","edinburgh","aberdeen","dundee","fife","highland","lothian","strathclyde","tayside","grampian","ayrshire","lanarkshire","renfrewshire","stirling","falkirk","dumfries","borders","moray","angus","perth","clackmannan","dunbarton","inverclyde","midlothian","orkney","shetland","hebrides","western isles","argyll"],
    "North East":["northumberland","newcastle","durham","tyneside","sunderland","gateshead","hartlepool","stockton","middlesbrough","redcar","darlington","cleveland","berwick","blyth","wansbeck","wear valley","derwentside","chester-le-street","easington","teesdale","sedgefield","alnwick","castle morpeth","tynedale"],
    "North West":["cumbria","carlisle","lancashire","lancaster","blackpool","blackburn","preston","burnley","chorley","fleetwood","manchester","bolton","bury","oldham","rochdale","salford","stockport","tameside","trafford","wigan","liverpool","knowsley","sefton","wirral","chester","warrington","macclesfield","crewe","cheshire","merseyside","halton","congleton","ellesmere","wyre","south ribble","south lakeland","ribble valley","pendle","hyndburn","rossendale","allerdale","barrow","copeland","eden","furness","fylde","vale royal"],
    "Yorkshire":["yorkshire","york","leeds","bradford","calderdale","kirklees","wakefield","barnsley","doncaster","rotherham","sheffield","hull","harrogate","scarborough","selby","craven","richmondshire","ryedale","hambleton","humberside","lincolnshire","grimsby","scunthorpe","east riding","north lincoln","north east lincoln"],
    "West Midlands":["birmingham","coventry","dudley","sandwell","solihull","walsall","wolverhampton","stafford","stoke","telford","shrewsbury","shropshire","worcester","bromsgrove","redditch","malvern","hereford","lichfield","tamworth","burton","nuneaton","rugby","warwick","stratford","cannock","bridgnorth","oswestry","wyre forest","wychavon","newcastle-under-lyme","staffordshire moorlands","south staffordshire","north warwickshire"],
    "East Midlands":["derbyshire","derby","nottingham","leicester","leicestershire","harborough","rutland","northampton","northamptonshire","kettering","corby","daventry","wellingborough","milton keynes","lincoln","boston","mansfield","ashfield","broxtowe","gedling","newark","rushcliffe","bassetlaw","south holland","north kesteven","south kesteven","west lindsey","east lindsey","amber valley","bolsover","chesterfield","erewash","high peak","melton","oadby","blaby","hinckley","charnwood","south derbyshire","north east derbyshire","derbyshire dales"],
    "East of England":["cambridge","peterborough","norfolk","norwich","suffolk","ipswich","bedford","luton","hertford","stevenage","watford","st. albans","welwyn","broxbourne","dacorum","essex","chelmsford","colchester","southend","basildon","braintree","brentwood","castle point","epping","harlow","maldon","rochford","tendring","thurrock","uttlesford","fenland","huntingdon","breckland","broadland","great yarmouth","kings lynn","babergh","forest heath","mid suffolk","st. edmundsbury","suffolk coastal","waveney","three rivers","hertsmere","bedfordshire","hertfordshire","cambridgeshire","south cambridgeshire","east cambridgeshire","south bedfordshire","mid bedfordshire","north hertfordshire","east hertfordshire","east northamptonshire","south northamptonshire"],
    "London":["london","westminster","camden","islington","hackney","tower hamlets","greenwich","lewisham","southwark","lambeth","wandsworth","hammersmith","kensington","chelsea","waltham forest","redbridge","havering","barking","dagenham","newham","bexley","bromley","croydon","sutton","merton","kingston","richmond","hounslow","hillingdon","ealing","brent","harrow","barnet","haringey","enfield","city of london","heathrow"],
    "South East":["kent","canterbury","dover","maidstone","medway","thanet","ashford","dartford","folkestone","gravesham","sevenoaks","swale","tonbridge","tunbridge","surrey","woking","guildford","elmbridge","epsom","spelthorne","reigate","runnymede","tandridge","waverley","sussex","brighton","eastbourne","hastings","lewes","rother","wealden","crawley","horsham","worthing","adur","arun","chichester","hampshire","portsmouth","southampton","basingstoke","winchester","eastleigh","fareham","gosport","hart","havant","new forest","rushmoor","test valley","east hampshire","buckingham","aylesbury","wycombe","chiltern","oxford","cherwell","vale of white horse","south oxfordshire","west oxfordshire","reading","slough","windsor","maidenhead","bracknell","wokingham","west berkshire","isle of wight","mole valley","south bucks","buckinghamshire","oxfordshire","surrey heath","shepway"],
    "South West":["devon","exeter","plymouth","torbay","torridge","cornwall","caradon","carrick","kerrier","penwith","restormel","somerset","bristol","bath","mendip","sedgemoor","taunton","gloucester","cheltenham","cotswold","forest of dean","stroud","tewkesbury","wiltshire","swindon","salisbury","kennet","dorset","bournemouth","poole","christchurch","purbeck","weymouth","portland","gloucestershire","south gloucestershire","north somerset","bath and","teignbridge","south hams","mid devon","west devon","east devon","north dorset","west dorset","east dorset","north wiltshire","west wiltshire","south somerset","taunton deane","west somerset","north cornwall"],
    "Wales":["wales","cardiff","swansea","newport","gwynedd","conwy","denbigh","flint","wrexham","anglesey","blaenau gwent","caerphilly","monmouth","torfaen","bridgend","merthyr","neath port talbot","rhondda","cynon","taff","vale of glamorgan","ceredigion","carmarthen","pembroke","powys","dyfed"],
    "Northern Ireland":["northern","belfast","antrim","armagh","down","fermanagh","londonderry","tyrone","ulster"],
}

def match_region(district_name):
    name = str(district_name or "").lower().strip()
    for region, keywords in REGION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in name:
                return region
    return None

def build_hourly_profile(sub_acc):
    grouped = sub_acc.groupby("hour").size()
    return [
        {"hour": float(h), "count": int(grouped.get(float(h), 0))}
        for h in range(24)
    ]

def build_region_entry(sub_acc):
    return {
        "hourly": build_hourly_profile(sub_acc),
        "radar": build_radar(sub_acc),
        "arc_flow": build_arc_flow(sub_acc),
        "total": int(len(sub_acc)),
    }

def build_region_profiles(acc_df, years):
    profiles = {}
    region_acc = acc_df.copy()
    region_acc["region_label"] = region_acc["district_label"].apply(match_region)
    region_acc = region_acc[region_acc["region_label"].notna()]

    for region in sorted(region_acc["region_label"].unique()):
        sub_region = region_acc[region_acc["region_label"] == region]
        entry = {"all": build_region_entry(sub_region)}
        for y in years:
            y_int = int(y)
            sub_year = sub_region[sub_region["year"] == y]
            entry[str(y_int)] = build_region_entry(sub_year)
        profiles[region] = entry
    return profiles

# ============================================================
# 6a. 文件 1：global_charts_data.json（全量聚合，不筛选）
# ============================================================
print("  6a. 构建 global_charts_data.json（全量聚合）")

# 车辆类型关联全量
all_veh = veh.groupby("vehicle_label").size().reset_index(name="count").sort_values("count", ascending=False)

# 致命事故数
fatal_count = int(severity[severity["severity_label"] == "Fatal"]["count"].sum()) if "Fatal" in severity["severity_label"].values else 0

# 高峰小时
peak_row = hourly.loc[hourly["count"].idxmax()]
peak_hour = f"{int(peak_row['hour']):02d}:00"

global_data = {
    "severity": severity.to_dict(orient="records"),
    "hourly": hourly.to_dict(orient="records"),
    "district_top10": district.head(10).to_dict(orient="records"),
    "district_all": district.to_dict(orient="records"),
    "vehicle": all_veh.to_dict(orient="records"),
    "radar": build_radar(acc),
    "calendar": build_calendar(acc),
    "arc_flow": build_arc_flow(acc),
    "points": build_detailed_points(acc, 2000),
    "meta": {
        "total_accidents": int(len(acc)),
        "total_casualties": int(len(cas)),
        "total_vehicles": int(len(veh)),
        "fatal_count": fatal_count,
        "peak_hour": peak_hour,
        "year_range": [int(acc["year"].min()), int(acc["year"].max())],
        "generated_at": pd.Timestamp.now().isoformat(),
    },
}
global_data = clean_for_json(global_data)

global_path = os.path.join(OUTPUT_DIR, "global_charts_data.json")
with open(global_path, "w", encoding="utf-8") as f:
    json.dump(global_data, f, ensure_ascii=False, indent=2)
global_size = os.path.getsize(global_path)
print(f"  [OK] 已保存: {global_path} ({global_size / 1024:.0f} KB)")

# ============================================================
# 6b. 文件 2：map_yearly_data.json（仅按年份维度拆分）
# ============================================================
print("  6b. 构建 map_yearly_data.json（按年份拆分）")

years_list = sorted(acc["year"].dropna().unique())
map_yearly = {}

def build_map_entry(sub_acc):
    d = sub_acc.groupby("district_label").size().reset_index(name="count").sort_values("count", ascending=False)
    return {
        "district_all": d.to_dict(orient="records"),
        "points": build_detailed_points(sub_acc, 2000),   # 点内嵌详情，无需独立 detail_points
    }

# 全量
map_yearly["all"] = build_map_entry(acc)
print(f"    全量: {len(map_yearly['all']['district_all'])} 个地区, "
      f"{len(map_yearly['all']['points'])} 个详细坐标点")

# 逐年
for y in years_list:
    y_int = int(y)
    sub = acc[acc["year"] == y]
    map_yearly[str(y_int)] = build_map_entry(sub)
    print(f"    {y_int}: {len(map_yearly[str(y_int)]['district_all'])} 个地区, "
          f"{len(map_yearly[str(y_int)]['points'])} 个坐标点")

map_yearly = clean_for_json(map_yearly)

map_yearly_path = os.path.join(OUTPUT_DIR, "map_yearly_data.json")
with open(map_yearly_path, "w", encoding="utf-8") as f:
    json.dump(map_yearly, f, ensure_ascii=False, indent=2)
map_size = os.path.getsize(map_yearly_path)
print(f"  [OK] 已保存: {map_yearly_path} ({map_size / 1024:.0f} KB)")

# ============================================================
# 6b2. 文件：region_profiles.json（地图区域联动右侧三图）
# ============================================================
print("  6b2. 构建 region_profiles.json（区域画像联动数据）")
region_profiles = clean_for_json(build_region_profiles(acc, years_list))
region_profiles_path = os.path.join(OUTPUT_DIR, "region_profiles.json")
with open(region_profiles_path, "w", encoding="utf-8") as f:
    json.dump(region_profiles, f, ensure_ascii=False, indent=2)
region_profiles_size = os.path.getsize(region_profiles_path)
print(f"  [OK] 已保存: {region_profiles_path} ({region_profiles_size / 1024:.0f} KB)")

# ============================================================
# 6c. 文件 3：sankey_data.json — 桑基图聚合
#     流向：Weather → Light → Vehicle（三级平衡）
#     nodes 全量统一，links 按年份拆分
# ============================================================
print("  6c. 构建 sankey_data.json（Weather → Light → Vehicle 流转）")

# 三列节点名称固定（全量去重），确保年份切换时布局不跳动
weather_nodes   = sorted(acc["weather_label"].dropna().unique().tolist())
light_nodes     = sorted(acc["light_label"].dropna().unique().tolist())
vehicle_nodes   = sorted(veh["vehicle_category"].dropna().unique().tolist())

# 为 ECharts sankey 构建全量 node list
sankey_nodes_all = []
for wn in weather_nodes:
    sankey_nodes_all.append({"name": wn, "itemStyle": {"color": "#26a69a"}})
for ln in light_nodes:
    sankey_nodes_all.append({"name": ln, "itemStyle": {"color": "#5b8def"}})
for vn in vehicle_nodes:
    sankey_nodes_all.append({"name": vn, "itemStyle": {"color": "#66bb6a"}})

# 构建 node name → index 映射
node_name_set = {n["name"] for n in sankey_nodes_all}

def build_sankey_links(sub_acc, sub_veh):
    """给定子集事故 + 子集车辆，返回 links 列表"""
    links = []
    sub_indices = sub_acc["Accident_Index"].unique()
    sub_veh_filtered = sub_veh[sub_veh["Accident_Index"].isin(sub_indices)]

    # ★ Weather → Light（以车辆为计数单位，与 Light→Vehicle 统一基准）
    #    先 join accidents+vehicles，再按 weather + light 聚合
    wl = sub_acc[["Accident_Index", "weather_label", "light_label"]].merge(
        sub_veh_filtered[["Accident_Index"]],
        on="Accident_Index"
    ).groupby(["weather_label", "light_label"]).size().reset_index(name="value")
    for _, row in wl.iterrows():
        if row["weather_label"] in node_name_set and row["light_label"] in node_name_set:
            links.append({
                "source": row["weather_label"],
                "target": row["light_label"],
                "value": int(row["value"]),
            })

    # ★ Light → Vehicle（以车辆为计数单位）
    lv = sub_acc[["Accident_Index", "light_label"]].merge(
        sub_veh_filtered[["Accident_Index", "vehicle_category"]],
        on="Accident_Index"
    ).groupby(["light_label", "vehicle_category"]).size().reset_index(name="value")
    for _, row in lv.iterrows():
        if row["light_label"] in node_name_set and row["vehicle_category"] in node_name_set:
            links.append({
                "source": row["light_label"],
                "target": row["vehicle_category"],
                "value": int(row["value"]),
            })

    return links

sankey_data = {}
years_list = sorted(acc["year"].dropna().unique())

# 全量
sankey_data["all"] = {
    "nodes": sankey_nodes_all,
    "links": build_sankey_links(acc, veh),
}
print(f"    全量: {len(sankey_nodes_all)} 节点, {len(sankey_data['all']['links'])} 条边")

# 逐年
for y in years_list:
    y_int = int(y)
    sub_acc = acc[acc["year"] == y]
    sub_veh = veh[veh["Accident_Index"].isin(sub_acc["Accident_Index"].unique())]
    sankey_data[str(y_int)] = {
        "nodes": sankey_nodes_all,  # ★ 复用全量节点，保证布局一致
        "links": build_sankey_links(sub_acc, sub_veh),
    }
    print(f"    {y_int}: {len(sankey_data[str(y_int)]['links'])} 条边")

sankey_data = clean_for_json(sankey_data)

sankey_path = os.path.join(OUTPUT_DIR, "sankey_data.json")
with open(sankey_path, "w", encoding="utf-8") as f:
    json.dump(sankey_data, f, ensure_ascii=False, indent=2)
sankey_size = os.path.getsize(sankey_path)
print(f"  [OK] 已保存: {sankey_path} ({sankey_size / 1024:.0f} KB)")

# ============================================================
# 6d. 文件 4：arc_flow_data.json — 城乡×严重程度 流转图
#     节点 ≤ 20，边 ≤ 50。按年份拆分。
#     结构：左右两排（Urban 左, Rural 右）× 3 严重程度
# ============================================================
print("  6d. 构建 arc_flow_data.json（Urban/Rural × Severity 流转）")

# 6 个固定节点
arc_nodes_template = [
    {"name": "Urban-Fatal",    "category": 0, "symbolSize": 40, "itemStyle": {"color": "#e53935"}},
    {"name": "Urban-Serious",  "category": 0, "symbolSize": 30, "itemStyle": {"color": "#fb8c00"}},
    {"name": "Urban-Slight",   "category": 0, "symbolSize": 20, "itemStyle": {"color": "#43a047"}},
    {"name": "Rural-Fatal",    "category": 1, "symbolSize": 40, "itemStyle": {"color": "#ef5350"}},
    {"name": "Rural-Serious",  "category": 1, "symbolSize": 30, "itemStyle": {"color": "#ff9800"}},
    {"name": "Rural-Slight",   "category": 1, "symbolSize": 20, "itemStyle": {"color": "#66bb6a"}},
]

def build_arc_links(counts_dict):
    """
    counts_dict: {"Urban-Fatal": N, "Urban-Serious": N, ...}
    返回 9 条边：
      - 3 条跨城乡同严重程度连线
      - 3 条 Urban 内部连线
      - 3 条 Rural 内部连线
    所有线宽由前端动态计算（_calcArcLinkWidths），后端仅输出纯数据。
    """
    links = []
    # 跨城乡同严重程度
    for sev in ["Fatal", "Serious", "Slight"]:
        u_key = f"Urban-{sev}"
        r_key = f"Rural-{sev}"
        links.append({
            "source": u_key, "target": r_key,
            "value": counts_dict.get(u_key, 0) + counts_dict.get(r_key, 0),
            "lineStyle": {"curveness": 0.25, "color": "#90a4ae"},
        })

    # Urban 内部流转
    for a, b in [("Fatal", "Serious"), ("Serious", "Slight"), ("Fatal", "Slight")]:
        ua = f"Urban-{a}"; ub = f"Urban-{b}"
        links.append({
            "source": ua, "target": ub,
            "value": counts_dict.get(ua, 0) + counts_dict.get(ub, 0),
            "lineStyle": {"curveness": 0.35, "color": "#5b8def"},
        })

    # Rural 内部流转
    for a, b in [("Fatal", "Serious"), ("Serious", "Slight"), ("Fatal", "Slight")]:
        ra = f"Rural-{a}"; rb = f"Rural-{b}"
        links.append({
            "source": ra, "target": rb,
            "value": counts_dict.get(ra, 0) + counts_dict.get(rb, 0),
            "lineStyle": {"curveness": 0.35, "color": "#ffa726"},
        })

    return links

arc_data = {}

def build_arc_entry(sub_acc):
    """对子数据集统计 6 个类别的计数（使用 groupby，避免逐行遍历）"""
    grouped = sub_acc.groupby(["urban_rural_label", "severity_label"]).size()
    counts = {}
    for (urban, sev), val in grouped.items():
        counts[f"{urban}-{sev}"] = int(val)
    return {
        "nodes": arc_nodes_template,
        "links": build_arc_links(counts),
    }

# 全量
arc_data["all"] = build_arc_entry(acc)
print(f"    全量: {len(arc_data['all']['nodes'])} 节点, {len(arc_data['all']['links'])} 条边")

# 逐年
for y in years_list:
    y_int = int(y)
    sub = acc[acc["year"] == y]
    arc_data[str(y_int)] = build_arc_entry(sub)
    print(f"    {y_int}: {len(arc_data[str(y_int)]['links'])} 条边")

arc_data = clean_for_json(arc_data)

arc_path = os.path.join(OUTPUT_DIR, "arc_flow_data.json")
with open(arc_path, "w", encoding="utf-8") as f:
    json.dump(arc_data, f, ensure_ascii=False, indent=2)
arc_size = os.path.getsize(arc_path)
print(f"  [OK] 已保存: {arc_path} ({arc_size / 1024:.0f} KB)")

# ============================================================
# 6e. 保留原来的独立小 JSON（每个几 KB，供详情面板按需加载）
# ============================================================
print("  6e. 输出独立小 JSON（兼容详情面板）")
separate_outputs = {
    "yearly_trend.json": yearly,
    "yearly_severity_trend.json": yearly_severity,
    "hourly_distribution.json": hourly,
    "daily_distribution.json": daily,
    "road_type_distribution.json": road_type,
    "light_conditions_distribution.json": light,
    "vehicle_type_distribution.json": vehicle_type,
    "severity_distribution.json": severity,
    "urban_rural_distribution.json": urban_rural,
    "district_top10.json": district.head(10),
}
for fname, df in separate_outputs.items():
    fpath = os.path.join(OUTPUT_DIR, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(df.to_dict(orient="records"), f, ensure_ascii=False, indent=2)
    print(f"  [OK] 已保存: {fpath}")

# ============================================================
# 6f. 同时输出 aggregated_data.json（兼容版，不包含 filter_cache）
# ============================================================
output = {}
output["yearly_trend"] = yearly.to_dict(orient="records")
output["yearly_severity_trend"] = yearly_severity.to_dict(orient="records")
output["hourly_distribution"] = hourly.to_dict(orient="records")
output["daily_distribution"] = daily.to_dict(orient="records")
output["road_type_distribution"] = road_type.to_dict(orient="records")
output["light_conditions_distribution"] = light.to_dict(orient="records")
output["vehicle_type_distribution"] = vehicle_type.to_dict(orient="records")
output["severity_distribution"] = severity.to_dict(orient="records")
output["urban_rural_distribution"] = urban_rural.to_dict(orient="records")
output["district_top10"] = district.head(10).to_dict(orient="records")
output["district_all"] = district.to_dict(orient="records")
output["meta"] = {
    "total_accidents": int(len(acc)),
    "total_casualties": int(len(cas)),
    "total_vehicles": int(len(veh)),
    "year_range": [int(acc["year"].min()), int(acc["year"].max())],
    "generated_at": pd.Timestamp.now().isoformat(),
}
output = clean_for_json(output)

aggregated_path = os.path.join(OUTPUT_DIR, "aggregated_data.json")
with open(aggregated_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
agg_size = os.path.getsize(aggregated_path)
print(f"  [OK] 已保存: {aggregated_path} ({agg_size / 1024:.0f} KB) — 不含 filter_cache")

print(f"\n全部完成！输出目录: {OUTPUT_DIR}")
print(f"  事故总数: {output['meta']['total_accidents']:,}")
print(f"  伤亡总数: {output['meta']['total_casualties']:,}")
print(f"  车辆总数: {output['meta']['total_vehicles']:,}")
print(f"  年份范围: {output['meta']['year_range']}")
