"""
Generate a REALISTIC unified UK GeoJSON.
Core design:
 - 80+ GB coastline nodes (clockwise, detailed = recognizable UK outline)
 - 5 internal boundary chains shared between adjacent regions (reversed direction)
 - Northern Ireland as separate polygon
 - Each region = coastline segment(s) + internal boundary(ies)
 - Adjacent regions share exact same coordinate chains (one direction reversed)
Output: frontend/data/uk_geo.json
"""

import json, os

OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "frontend", "data", "uk_geo.json")

# ==========================================================
# 1. GB COASTLINE — detailed clockwise chain, ~80 nodes
#    Format: [lon, lat]
# ==========================================================
GB_COAST = [
    # Cornwall S coast
    [-5.72, 50.06], [-5.58, 50.07], [-5.42, 50.12], [-5.22, 50.20],
    [-5.02, 50.28], [-4.82, 50.33], [-4.55, 50.35], [-4.32, 50.36],
    # Devon → Dorset
    [-4.08, 50.38], [-3.82, 50.43], [-3.58, 50.51], [-3.38, 50.57],
    [-3.12, 50.60], [-2.88, 50.62], [-2.62, 50.64], [-2.42, 50.67],
    # Hampshire → Sussex → Brighton
    [-2.18, 50.70], [-1.88, 50.72], [-1.60, 50.75], [-1.32, 50.78],
    [-1.02, 50.81], [-0.72, 50.83], [-0.40, 50.84], [-0.08, 50.86],
    [0.18, 50.90], [0.42, 50.94], [0.70, 50.98],
    # Kent → Dover
    [0.98, 51.04], [1.18, 51.10], [1.35, 51.15],
    # Thames Estuary N
    [1.42, 51.32], [1.38, 51.48], [1.42, 51.62], [1.52, 51.72],
    # East Anglia → Norfolk
    [1.65, 51.88], [1.72, 52.05], [1.74, 52.22], [1.76, 52.42],
    [1.74, 52.60], [1.65, 52.78], [1.50, 52.93],
    # The Wash → Humber
    [1.22, 52.98], [0.85, 53.00], [0.52, 52.98], [0.32, 53.10],
    [0.22, 53.30], [0.18, 53.50], [0.14, 53.62],
    # Yorkshire → NE coast
    [0.00, 53.72], [-0.12, 53.90], [-0.18, 54.08], [-0.22, 54.25],
    [-0.38, 54.42], [-0.55, 54.60], [-0.72, 54.75],
    # Durham → Northumberland
    [-0.90, 54.88], [-1.05, 55.00], [-1.25, 55.15], [-1.42, 55.32],
    [-1.50, 55.48], [-1.52, 55.60],
    # Berwick → SE Scotland
    [-1.62, 55.72], [-1.72, 55.82], [-1.88, 55.90],
    # Edinburgh → Fife
    [-2.10, 55.98], [-2.30, 56.05], [-2.48, 56.15], [-2.62, 56.28],
    # Dundee → Aberdeen
    [-2.68, 56.45], [-2.55, 56.62], [-2.35, 56.78], [-2.12, 56.98],
    [-1.98, 57.15], [-1.88, 57.30], [-1.82, 57.48], [-1.88, 57.65],
    # Moray Firth
    [-2.02, 57.78], [-2.28, 57.88], [-2.62, 57.95], [-3.02, 58.05],
    # John o' Groats → N coast
    [-3.42, 58.15], [-3.72, 58.25], [-4.08, 58.37], [-4.48, 58.46],
    [-4.82, 58.52], [-5.12, 58.56],
    # NW Scotland
    [-5.48, 58.48], [-5.62, 58.30], [-5.78, 58.02], [-5.92, 57.72],
    [-6.02, 57.42], [-6.10, 57.08], [-6.20, 56.78],
    # W Scotland → Hebrides area → Kintyre
    [-6.28, 56.50], [-6.25, 56.22], [-6.12, 55.95],
    [-5.88, 55.72], [-5.58, 55.55], [-5.32, 55.38],
    # Solway Firth
    [-5.08, 55.18], [-4.85, 55.00], [-4.58, 54.85], [-4.25, 54.75],
    [-3.88, 54.68], [-3.55, 54.62],
    # Lancashire → Liverpool
    [-3.38, 54.42], [-3.25, 54.22], [-3.20, 53.98], [-3.28, 53.78],
    [-3.42, 53.60], [-3.58, 53.48], [-3.78, 53.42],
    # N Wales coast
    [-4.02, 53.38], [-4.28, 53.35], [-4.55, 53.32], [-4.75, 53.22],
    # Anglesey → Cardigan Bay
    [-4.85, 53.00], [-4.82, 52.72], [-4.88, 52.42], [-5.02, 52.12],
    [-5.15, 51.88], [-5.22, 51.68],
    # SW Wales → S Wales
    [-5.12, 51.55], [-4.88, 51.52], [-4.60, 51.55], [-4.32, 51.58],
    [-4.05, 51.55], [-3.78, 51.48], [-3.55, 51.45],
    # Cardiff → Bristol Channel → N Devon
    [-3.32, 51.42], [-3.42, 51.32], [-3.72, 51.22], [-3.98, 51.12],
    [-4.22, 51.02], [-4.52, 50.95], [-4.82, 50.82], [-5.12, 50.70],
    [-5.38, 50.55], [-5.55, 50.38], [-5.68, 50.18], [-5.72, 50.06],
]

# Internal junction NODES (index into GB_COAST)
# We use actual coordinate values as identifiers
def find_node(lon, lat, tolerance=0.08):
    """Find index of node in GB_COAST within tolerance"""
    best = -1; best_dist = 999
    for i, pt in enumerate(GB_COAST):
        d = ((pt[0]-lon)**2 + (pt[1]-lat)**2)**0.5
        if d < best_dist: best_dist = d; best = i
    return best if best_dist < tolerance else -1

# Key junctions on the coast (lon, lat)
J_COAST = {
    "lands_end":   (-5.72, 50.06),
    "plymouth":    (-4.08, 50.38),
    "weymouth":    (-2.42, 50.67),
    "southampton": (-1.32, 50.78),
    "brighton":    (-0.08, 50.86),
    "dover":       (1.35, 51.15),
    "harwich":     (1.65, 51.88),
    "gr_ya":       (1.74, 52.60),  # Great Yarmouth
    "the_wash":    (0.85, 53.00),
    "humber":      (0.14, 53.62),
    "scarborough": (-0.18, 54.08),
    "hartlepool":  (-0.90, 54.88),
    "berwick":     (-1.52, 55.60),  # Scotia border E end
    "edinburgh":   (-2.10, 55.98),
    "dundee":      (-2.68, 56.45),
    "aberdeen":    (-1.98, 57.15),
    "fraserburgh": (-1.88, 57.65),
    "moray_w":     (-3.02, 58.05),
    "cape_wrath":  (-5.12, 58.56),
    "skye_area":   (-6.10, 57.08),
    "kintyre":     (-5.58, 55.55),
    "solway_w":    (-3.55, 54.62),  # Scotia border W end
    "liverpool":   (-3.42, 53.60),
    "holyhead":    (-4.55, 53.32),
    "cardigan":    (-4.88, 52.42),
    "st_davids":   (-5.22, 51.68),
    "swansea":     (-4.32, 51.58),
    "cardiff":     (-3.55, 51.45),
    "bristol_chn": (-3.42, 51.32),
    "barnstaple":  (-4.22, 51.02),
}

# Build junction → coast_index map
J_IDX = {}
for name, (lon, lat) in J_COAST.items():
    idx = find_node(lon, lat)
    if idx < 0:
        print(f"  WARNING: junction '{name}' not on coast!")
    J_IDX[name] = idx

# ==========================================================
# 2. INTERNAL BOUNDARIES — shared coordinate chains
# ==========================================================

# Scotland-England border (Solway → Berwick)
SCO_ENG_BORDER = [
    [-3.55, 54.62], [-3.30, 54.72], [-3.00, 54.82], [-2.72, 54.92],
    [-2.45, 55.10], [-2.25, 55.28], [-2.10, 55.45], [-1.88, 55.55],
    [-1.72, 55.62], [-1.52, 55.60],
]

# Wales-England border (S→N)
WALES_ENG_BORDER = [
    [-3.55, 51.45], [-3.25, 51.52], [-3.05, 51.68], [-2.88, 51.88],
    [-2.82, 52.08], [-2.78, 52.28], [-2.82, 52.48], [-2.92, 52.68],
    [-3.05, 52.82], [-3.22, 52.98], [-3.38, 53.15], [-3.42, 53.35],
    [-3.42, 53.60],
]

# Pennine divide (separating NW from NE/Yorkshire, roughly N→S)
PENNINE_DIVIDE = [
    [-3.55, 54.62], [-3.35, 54.42], [-3.10, 54.22], [-2.85, 54.00],
    [-2.60, 53.82], [-2.38, 53.62], [-2.20, 53.42],
]

# Midlands horizontal divide (W→E, roughly Liverpool→The Wash)
MIDLAND_DIVIDE = [
    [-3.42, 53.60], [-3.15, 53.52], [-2.88, 53.42], [-2.62, 53.28],
    [-2.35, 53.12], [-2.08, 52.95], [-1.82, 52.80], [-1.55, 52.70],
    [-1.30, 52.62], [-1.02, 52.58], [-0.75, 52.55], [-0.48, 52.58],
    [-0.20, 52.62], [0.18, 52.75], [0.52, 52.90], [0.85, 53.00],
]

# Severn-Wash line (SW→NE through Midlands)
SEVERN_WASH = [
    [-3.42, 51.32], [-3.15, 51.45], [-2.85, 51.55], [-2.60, 51.68],
    [-2.35, 51.82], [-2.15, 51.98], [-1.95, 52.15], [-1.72, 52.30],
    [-1.50, 52.42], [-1.25, 52.55], [-1.00, 52.62], [-0.72, 52.70],
    [-0.45, 52.75], [-0.20, 52.78], [0.18, 52.75], [0.52, 52.90],
    [0.85, 53.00],
]

# N-S internal line through England
ENG_N_S = [
    [-1.52, 55.60], [-1.45, 55.38], [-1.35, 55.12], [-1.25, 54.82],
    [-1.12, 54.55], [-1.00, 54.30], [-0.88, 54.02], [-0.80, 53.78],
    [-0.72, 53.55], [-0.62, 53.35], [-0.48, 53.12], [-0.32, 52.90],
    [-0.18, 52.70], [0.00, 52.50], [0.15, 52.32], [0.25, 52.12],
    [0.30, 51.88], [0.28, 51.70], [0.20, 51.55], [0.10, 51.48],
    [-0.08, 51.40],
]

# Great Glen (Scotland internal divide, SW→NE)
GREAT_GLEN = [
    [-5.58, 55.55], [-5.30, 55.72], [-5.05, 55.88], [-4.80, 56.05],
    [-4.50, 56.25], [-4.22, 56.48], [-3.92, 56.68], [-3.62, 56.85],
    [-3.32, 57.02], [-3.02, 57.15], [-2.72, 57.28], [-2.42, 57.48],
    [-2.15, 57.65], [-1.88, 57.65],
]

# Northern Ireland outline (clockwise)
NI_COAST = [
    [-5.88, 54.60], [-5.75, 54.65], [-5.62, 54.72], [-5.55, 54.82],
    [-5.48, 54.92], [-5.45, 55.02], [-5.48, 55.10], [-5.58, 55.18],
    [-5.72, 55.22], [-5.88, 55.20], [-6.08, 55.15], [-6.30, 55.12],
    [-6.50, 55.12], [-6.68, 55.08], [-6.82, 55.00], [-6.95, 54.92],
    [-7.12, 54.82], [-7.30, 54.70], [-7.48, 54.60], [-7.62, 54.50],
    [-7.75, 54.42], [-7.85, 54.35], [-7.90, 54.28], [-7.88, 54.20],
    [-7.78, 54.12], [-7.60, 54.08], [-7.40, 54.05], [-7.20, 54.05],
    [-7.00, 54.08], [-6.78, 54.12], [-6.58, 54.18], [-6.38, 54.28],
    [-6.20, 54.38], [-6.02, 54.50], [-5.88, 54.60],
]

# ==========================================================
# 3. HELPER FUNCTIONS
# ==========================================================

def coast_slice(a_name, b_name):
    """Get coastline segment between two junction nodes (clockwise from a to b)"""
    ai = J_IDX[a_name]
    bi = J_IDX[b_name]
    if ai < 0 or bi < 0: return []
    if ai <= bi:
        return [list(p) for p in GB_COAST[ai:bi+1]]
    else:
        # wrap around
        return [list(p) for p in GB_COAST[ai:] + GB_COAST[:bi+1]]

def reverse_chain(chain):
    return list(reversed([list(p) for p in chain]))

def close_ring(chain):
    c = [list(p) for p in chain]
    if c and c[0] != c[-1]:
        c.append(c[0])
    return c

def make_polygon(coords):
    return {"type": "Polygon", "coordinates": [close_ring(coords)]}

def make_feature(name, coords):
    return {"type": "Feature", "properties": {"name": name},
            "geometry": make_polygon(coords)}

# ==========================================================
# 4. DEFINE 12 REGIONS using coast slices + internal borders
# ==========================================================

# I'll define each region's polygon as:
#   coast from J_A to J_B (clockwise) +
#   internal border from J_B back to J_A

REGIONS = {}

# 1. Wales: coast from Bristol Channel → around Wales → Liverpool,
#    then back along Wales-England border
REGIONS["Wales"] = (
    coast_slice("bristol_chn", "cardiff") +
    coast_slice("cardiff", "swansea") +
    coast_slice("swansea", "st_davids") +
    coast_slice("st_davids", "cardigan") +
    coast_slice("cardigan", "holyhead") +
    coast_slice("holyhead", "liverpool") +
    reverse_chain(WALES_ENG_BORDER)
)

# 2. South West: coast from Land's End → Bristol Channel,
#    internal border back along Severn-Wash line (SW portion)
REGIONS["South West"] = (
    coast_slice("lands_end", "plymouth") +
    coast_slice("plymouth", "weymouth") +
    coast_slice("weymouth", "southampton") +
    coast_slice("southampton", "brighton")[:-2] +  # stop before Brighton
    # wait, this is getting complex. Let me simplify the region definitions.
    # Actually the coastline needs careful handling.

    # Simpler approach: define each region with explicit coast segments
    # South West: from lands_end clockwise to about brighton area,
    #             then back along Severn-Wash
    coast_slice("barnstaple", "bristol_chn") +
    coast_slice("bristol_chn", "cardiff")[:3] +
    reverse_chain(SEVERN_WASH)[:20]  # partial Severn-Wash
)

# Hmm, this approach of manually concatenating coast slices is getting very
# complex and error-prone. Let me use a DIFFERENT approach:

# For each region, I'll directly list the chain of junction nodes around its boundary.
# Each region boundary is defined as:
#   [junction_A, junction_B, junction_C, ..., back to junction_A]
# where adjacent nodes are connected by either a coast segment or an internal border.

# This is cleaner and ensures shared boundaries.

# Let me redefine the regions using a PATH-based approach.

# Actually, let me take the SIMPLEST reliable approach:
# 1. Define GB outline as one continuous MultiPolygon (Great Britain island)
# 2. Define regional divisions as LineStrings OVERLAID on the map
# 3. For ECharts, render the GB polygon as base + LineStrings as separate series

# Wait, but ECharts maps need each clickable region as a Feature.
# OK let me just do the full polygon definitions properly.

# ==========================================================
# APPROACH: Define each region boundary as a sequence of
#           JUNCTION NAMES. The polygon is built by connecting
#           these junctions using either coastline or internal borders.
# ==========================================================

# Let me define 12 regions as paths through named junctions.
# Each junction pair uses either coast segment or internal border.

# For clarity, let me define some helpful functions:

def coast_between(j1, j2):
    """Get coastline from junction j1 to junction j2 (clockwise)"""
    i1 = J_IDX[j1]
    i2 = J_IDX[j2]
    if i1 < 0 or i2 < 0: return []
    result = []
    if i1 <= i2:
        for i in range(i1, i2 + 1):
            result.append(list(GB_COAST[i]))
    else:
        for i in range(i1, len(GB_COAST)):
            result.append(list(GB_COAST[i]))
        for i in range(0, i2 + 1):
            result.append(list(GB_COAST[i]))
    return result

def internal_path(points):
    """Return internal boundary as-is (shared between two regions)"""
    return [list(p) for p in points]

# Now define each region as: [direction, j1, j2] entries
# where direction = "coast" (clockwise) or "border" (use named border forward)
# or "border_rev" (use named border reversed)

# To keep this manageable, I'll define each region's polygon directly
# as a sequence of coordinate arrays, built from coast segments and borders.



def build_region(*segments):
    """Build a region polygon from a sequence of coordinate arrays.
    Each argument is a list of [lon,lat] pairs.
    Segments are concatenated in order.
    The ring is automatically closed.
    """
    result = []
    for seg in segments:
        pts = [list(p) for p in seg]
        if result and pts and result[-1] == pts[0]:
            pts = pts[1:]  # avoid duplicate junction point
        result.extend(pts)
    return result

# ==========================================================
# 5. BUILD 12 REGIONS systematically
# ==========================================================

# I need to pick the right junctions for each region.
# Let me list the coastal junctions in clockwise order:
# lands_end → plymouth → weymouth → southampton → brighton → dover →
# harwich → gr_ya → the_wash → humber → scarborough → hartlepool →
# berwick → edinburgh → dundee → aberdeen → fraserburgh → moray_w →
# cape_wrath → skye_area → kintyre → solway_w → liverpool →
# holyhead → cardigan → st_davids → swansea → cardiff → bristol_chn →
# barnstaple → lands_end

# Define region boundaries as [coast_start, coast_end, internal_border_back]

# For clarity, let me name internal border segments:
def make_border(pts):
    return [list(p) for p in pts]

B_SCO_ENG   = make_border(SCO_ENG_BORDER)         # Solway → Berwick
B_SCO_DIV   = make_border(GREAT_GLEN)              # Highland divide
B_WALES_ENG = make_border(WALES_ENG_BORDER)        # S Wales → Liverpool
B_PENNINE   = make_border(PENNINE_DIVIDE)          # Solway → S of Pennines
B_MIDLAND   = make_border(MIDLAND_DIVIDE)          # Liverpool → The Wash
B_SEV_WASH  = make_border(SEVERN_WASH)             # Bristol → The Wash
B_ENG_NS    = make_border(ENG_N_S)                 # Berwick → Brighton-ish
B_NI        = make_border(NI_COAST)                # Northern Ireland

CS = coast_between  # shorthand

# ---- 1. SCOTLAND (north of SCO_ENG_BORDER + GREAT_GLEN split creates 2 regions) ----
# Actually, let me keep Scotland as one region since there are only 12 total
REGIONS["Scotland"] = build_region(
    CS("solway_w", "berwick"),                            # S coast along border
    CS("berwick", "edinburgh"),                           # E coast
    CS("edinburgh", "dundee"),
    CS("dundee", "aberdeen"),
    CS("aberdeen", "fraserburgh"),
    CS("fraserburgh", "moray_w"),
    CS("moray_w", "cape_wrath"),                          # N coast
    CS("cape_wrath", "skye_area"),                        # NW coast
    CS("skye_area", "kintyre"),                           # W coast
    CS("kintyre", "solway_w"),                            # SW coast
    reverse_chain(B_SCO_ENG),                             # back to start
)

# ---- 2. NORTH EAST ENGLAND ----
REGIONS["North East"] = build_region(
    reverse_chain(B_SCO_ENG),                             # Scottish border
    CS("berwick", "hartlepool"),                          # E coast S
    CS("hartlepool", "scarborough"),
    CS("scarborough", "humber"),
    reverse_chain(B_PENNINE),                             # back W along Pennines
)

# ---- 3. NORTH WEST ENGLAND ----
REGIONS["North West"] = build_region(
    B_PENNINE,                                            # Pennines E boundary
    CS("solway_w", "liverpool"),                          # W coast
    CS("liverpool", "holyhead"),
    reverse_chain(B_MIDLAND[:10]),                        # S boundary (partial)
    # Close back to Pennines start
)

# ---- 4. YORKSHIRE & HUMBERSIDE ----
REGIONS["Yorkshire"] = build_region(
    B_PENNINE,                                            # W boundary
    CS("humber", "the_wash"),                             # SE coast
    reverse_chain(B_ENG_NS[9:18]),                        # S boundary
    # Pennines S end → E anglia
)

# ---- 5. WEST MIDLANDS ----
REGIONS["West Midlands"] = build_region(
    B_WALES_ENG,                                          # W boundary (with Wales)
    B_MIDLAND[8:],                                        # N boundary (partial)
    reverse_chain(B_ENG_NS[4:12]),                        # E boundary
    B_SEV_WASH[:10],                                      # S boundary
)

# ---- 6. EAST MIDLANDS ----
REGIONS["East Midlands"] = build_region(
    B_ENG_NS[4:12],                                       # W boundary
    B_MIDLAND[8:],                                        # N boundary
    CS("the_wash", "humber"),                             # E coast
    reverse_chain(B_SEV_WASH[10:20]),                     # S boundary
)

# ---- 7. EAST OF ENGLAND ----
REGIONS["East of England"] = build_region(
    B_ENG_NS[9:18],                                       # W boundary
    CS("humber", "the_wash"),                             # N coast (wait, this is wrong direction)
    # Let me fix: East of England = E coast from The Wash to Thames
    CS("the_wash", "gr_ya"),                              # N coast
    CS("gr_ya", "harwich"),                               # E coast
    CS("harwich", "dover"),                               # SE coast
    B_ENG_NS[14:],                                        # SW boundary
)

# Hmm, the region definitions are getting tangled because I'm mixing up
# the junction order. Let me restart with a much cleaner approach.

# ==========================================================
# CLEAN APPROACH: Define each region by a CLOSED LOOP of
# named coordinate chains (coast segments & internal borders)
# ==========================================================

# I'll define named segments:
# Coast segments (clockwise):
COAST = {
    "C_SW1": CS("lands_end", "plymouth"),
    "C_SW2": CS("plymouth", "weymouth"),
    "C_SW3": CS("weymouth", "southampton"),
    "C_S1":  CS("southampton", "brighton"),
    "C_S2":  CS("brighton", "dover"),
    "C_E1":  CS("dover", "harwich"),
    "C_E2":  CS("harwich", "gr_ya"),
    "C_E3":  CS("gr_ya", "the_wash"),
    "C_E4":  CS("the_wash", "humber"),
    "C_E5":  CS("humber", "scarborough"),
    "C_E6":  CS("scarborough", "hartlepool"),
    "C_E7":  CS("hartlepool", "berwick"),
    "C_SCO_E": CS("berwick", "aberdeen"),
    "C_SCO_N": CS("aberdeen", "cape_wrath"),
    "C_SCO_W": CS("cape_wrath", "kintyre"),
    "C_SCO_SW": CS("kintyre", "solway_w"),
    "C_NW1": CS("solway_w", "liverpool"),
    "C_NW2": CS("liverpool", "holyhead"),
    "C_WALES_N": CS("holyhead", "cardigan"),
    "C_WALES_W": CS("cardigan", "st_davids"),
    "C_WALES_S": CS("st_davids", "swansea"),
    "C_WALES_SE": CS("swansea", "cardiff"),
    "C_SEVERN": CS("cardiff", "bristol_chn"),
    "C_BS1": CS("bristol_chn", "barnstaple"),
    "C_BS2": CS("barnstaple", "lands_end"),
}

# Internal borders:
IB = {
    "B_SCO_ENG":   make_border(SCO_ENG_BORDER),
    "B_WALES_ENG": make_border(WALES_ENG_BORDER),
    "B_PENNINE":   make_border(PENNINE_DIVIDE),
    "B_MIDLAND":   make_border(MIDLAND_DIVIDE),
    "B_SEV_WASH":  make_border(SEVERN_WASH),
    "B_ENG_NS":    make_border(ENG_N_S),
}
IB_REV = {k: reverse_chain(v) for k, v in IB.items()}

# ==========================================================
# 6. 12 REGIONS — clean polygon definitions
# ==========================================================
R = {}

# Scotland = everything N of Scotland-England border
R["Scotland"] = build_region(
    IB["B_SCO_ENG"],
    COAST["C_E7"], COAST["C_SCO_E"], COAST["C_SCO_N"],
    COAST["C_SCO_W"], COAST["C_SCO_SW"],
    IB_REV["B_SCO_ENG"],
)

# North East England
R["North East"] = build_region(
    IB_REV["B_SCO_ENG"],
    COAST["C_E7"], COAST["C_E6"], COAST["C_E5"], COAST["C_E4"],
    IB_REV["B_PENNINE"],
)

# North West England
R["North West"] = build_region(
    IB["B_PENNINE"],
    COAST["C_NW1"], COAST["C_NW2"],
    IB_REV["B_WALES_ENG"],
)

# Yorkshire & Humberside
R["Yorkshire"] = build_region(
    IB["B_PENNINE"],
    COAST["C_E4"], COAST["C_E3"],
    IB_REV["B_MIDLAND"],
)

# West Midlands
R["West Midlands"] = build_region(
    IB["B_WALES_ENG"],
    IB["B_MIDLAND"],
    IB_REV["B_ENG_NS"],
    IB_REV["B_SEV_WASH"],
)

# East Midlands
R["East Midlands"] = build_region(
    IB["B_ENG_NS"],
    IB["B_MIDLAND"],
    COAST["C_E3"], COAST["C_E2"],
    IB_REV["B_SEV_WASH"],
)

# East of England
R["East of England"] = build_region(
    IB["B_ENG_NS"],
    COAST["C_E3"], COAST["C_E2"], COAST["C_E1"], COAST["C_S2"],
    IB_REV["B_SEV_WASH"],
)

# London
R["London"] = build_region(
    [[-0.55, 51.60], [-0.38, 51.65], [-0.10, 51.68], [0.15, 51.62],
     [0.22, 51.52], [0.10, 51.42], [-0.12, 51.38], [-0.40, 51.40],
     [-0.55, 51.48], [-0.55, 51.60]],
)

# South East England
R["South East"] = build_region(
    IB["B_ENG_NS"][14:],
    COAST["C_S2"], COAST["C_S1"],
    COAST["C_SW3"], COAST["C_SW2"],
    IB_REV["B_SEV_WASH"][:10],
)

# South West England
R["South West"] = build_region(
    IB["B_SEV_WASH"][:10],
    COAST["C_SW2"], COAST["C_SW1"],
    COAST["C_BS2"], COAST["C_BS1"], COAST["C_SEVERN"],
    IB_REV["B_WALES_ENG"][:5],
)

# Wales
R["Wales"] = build_region(
    IB["B_WALES_ENG"],
    COAST["C_WALES_N"], COAST["C_WALES_W"],
    COAST["C_WALES_S"], COAST["C_WALES_SE"], COAST["C_SEVERN"],
    IB_REV["B_WALES_ENG"],
)

# Northern Ireland (separate island)
R["Northern Ireland"] = build_region(
    B_NI,
)

# ==========================================================
# 7. BUILD GeoJSON & VALIDATE
# ==========================================================
features = []
for name in ["Scotland", "North East", "North West", "Yorkshire",
             "West Midlands", "East Midlands", "East of England",
             "London", "South East", "South West", "Wales",
             "Northern Ireland"]:
    coords = R.get(name, [])
    if coords:
        features.append(make_feature(name, coords))
    else:
        print(f"  WARNING: region '{name}' has no coordinates!")

geojson = {"type": "FeatureCollection", "features": features}

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)

# ---- REPORT ----
print(f"[OK] Generated UK GeoJSON: {OUTPUT}")
print(f"  {len(features)} regions")
total_verts = 0
for feat in features:
    ring = feat["geometry"]["coordinates"][0]
    closed = "closed" if ring[0] == ring[-1] else "OPEN!"
    v = len(ring) - 1
    total_verts += v
    bbox_lon = [min(p[0] for p in ring), max(p[0] for p in ring)]
    bbox_lat = [min(p[1] for p in ring), max(p[1] for p in ring)]
    print(f"  [{closed:6s}] {feat['properties']['name']:22s}  {v:3d} verts  "
          f"lon=[{bbox_lon[0]:.1f},{bbox_lon[1]:.1f}] lat=[{bbox_lat[0]:.1f},{bbox_lat[1]:.1f}]")
print(f"  Total vertices: {total_verts}")
print(f"  File size: {os.path.getsize(OUTPUT):,} bytes")
