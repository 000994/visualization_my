"""Fixed UK GeoJSON generator with correct coast directions."""
import json, os

OUT = "frontend/data/uk_geo.json"

C = [
    (-5.72,50.06),(-5.50,50.10),(-5.20,50.20),(-4.80,50.32),(-4.40,50.35),
    (-4.00,50.38),(-3.60,50.45),(-3.20,50.55),(-2.80,50.60),(-2.40,50.66),
    (-2.00,50.70),(-1.60,50.74),(-1.30,50.78),
    (-0.90,50.81),(-0.40,50.84),(0.10,50.88),(0.50,50.94),(0.90,51.02),
    (1.20,51.10),(1.36,51.16),
    (1.44,51.34),(1.40,51.52),(1.44,51.65),(1.55,51.78),(1.68,51.95),
    (1.73,52.18),(1.76,52.42),(1.74,52.62),
    (1.60,52.80),(1.30,52.95),(0.85,53.00),(0.50,53.00),(0.28,53.14),
    (0.19,53.38),(0.14,53.56),
    (0.00,53.72),(-0.14,53.92),(-0.18,54.12),(-0.26,54.32),(-0.48,54.50),
    (-0.68,54.68),(-0.86,54.84),(-1.05,55.00),(-1.24,55.18),(-1.42,55.36),
    (-1.52,55.52),(-1.54,55.62),
    (-1.68,55.76),(-1.82,55.86),(-1.98,55.94),(-2.18,56.02),(-2.40,56.10),
    (-2.56,56.22),(-2.68,56.38),
    (-2.66,56.52),(-2.48,56.68),(-2.28,56.84),(-2.08,57.04),(-1.92,57.22),
    (-1.84,57.40),(-1.82,57.56),(-1.88,57.72),(-2.12,57.82),(-2.42,57.92),
    (-2.78,58.00),(-3.20,58.12),
    (-3.58,58.22),(-3.90,58.32),(-4.28,58.42),(-4.62,58.50),(-5.00,58.56),
    (-5.32,58.50),(-5.56,58.36),(-5.72,58.14),(-5.88,57.88),(-5.98,57.58),
    (-6.08,57.28),(-6.16,56.98),(-6.22,56.68),(-6.28,56.38),(-6.26,56.10),
    (-6.08,55.82),(-5.80,55.58),(-5.50,55.46),(-5.22,55.30),(-4.96,55.10),
    (-4.72,54.92),(-4.44,54.78),(-4.08,54.70),(-3.72,54.64),(-3.52,54.60),
    (-3.34,54.36),(-3.20,54.14),(-3.18,53.88),(-3.28,53.72),(-3.44,53.56),
    (-3.64,53.46),(-3.86,53.38),(-4.12,53.34),(-4.36,53.32),(-4.58,53.30),
    (-4.80,53.16),(-4.86,52.92),(-4.84,52.64),(-4.90,52.34),(-5.06,52.04),
    (-5.20,51.78),(-5.24,51.62),(-5.08,51.52),(-4.80,51.50),(-4.52,51.54),
    (-4.24,51.58),(-3.96,51.56),(-3.68,51.48),(-3.50,51.44),(-3.30,51.42),
    (-3.46,51.28),(-3.78,51.18),(-4.08,51.06),(-4.36,50.96),(-4.66,50.84),
    (-4.96,50.72),(-5.26,50.58),(-5.48,50.40),(-5.64,50.20),(-5.72,50.06),
]

NI = [
    (-5.88,54.60),(-5.74,54.66),(-5.60,54.74),(-5.54,54.84),(-5.48,54.94),
    (-5.46,55.04),(-5.50,55.12),(-5.60,55.20),(-5.76,55.24),(-5.94,55.22),
    (-6.14,55.16),(-6.36,55.12),(-6.54,55.10),(-6.72,55.06),(-6.86,54.98),
    (-7.00,54.88),(-7.18,54.78),(-7.36,54.66),(-7.52,54.56),(-7.66,54.46),
    (-7.78,54.38),(-7.86,54.30),(-7.90,54.22),(-7.86,54.14),(-7.74,54.06),
    (-7.56,54.02),(-7.34,54.00),(-7.12,54.02),(-6.88,54.06),(-6.66,54.14),
    (-6.46,54.24),(-6.26,54.36),(-6.06,54.48),(-5.88,54.60),
]

REF = {
    "Solway":(-3.52,54.60),"Berwick":(-1.54,55.62),"Liverpool":(-3.44,53.56),
    "Wash":(0.78,53.00),"Humber":(0.14,53.56),"Severn":(-3.30,51.42),
    "Dover":(1.36,51.16),"Harwich":(1.55,51.78),"GYa":(1.74,52.62),
    "Plymouth":(-4.00,50.38),"Brighton":(0.10,50.88),"Holyhead":(-4.58,53.30),
    "StD":(-5.24,51.62),"Swansea":(-4.24,51.58),"Cardiff":(-3.30,51.42),
    "Bristol":(-2.58,51.45),"Bham":(-1.88,52.48),"Manch":(-2.24,53.48),
    "Leeds":(-1.55,53.80),"London":(-0.12,51.51),
}
P = {k: list(v) for k, v in REF.items()}

def nearest(lon, lat):
    bi, bd = 0, 999
    for i, (cl, ct) in enumerate(C):
        d = ((cl-lon)**2 + (ct-lat)**2)**0.5
        if d < bd: bd = d; bi = i
    return bi

def idx(name): return nearest(REF[name][0], REF[name][1])

def coast(i, j):
    if i <= j: return [list(C[k]) for k in range(i, j+1)]
    return [list(C[k]) for k in range(i, len(C))] + [list(C[k]) for k in range(0, j+1)]

def coast_rev(i, j):
    if i >= j: return [list(C[k]) for k in range(i, j-1, -1)]
    return [list(C[k]) for k in range(i, -1, -1)] + [list(C[k]) for k in range(len(C)-1, j-1, -1)]

def close(ring):
    r = [list(p) for p in ring]
    if r and r[0] != r[-1]: r.append(r[0])
    return r

def feat(name, pts):
    return {"type":"Feature","properties":{"name":name},
            "geometry":{"type":"Polygon","coordinates":[close(pts)]}}

R = {}

# 1. Scotland: short CCW path through Scotland
R["Scotland"] = feat("Scotland",
    coast_rev(idx("Solway"), idx("Berwick")) + [P["Solway"]]
)

# 2. North East: SCO_ENG + E coast CCW + Pennine
R["North East"] = feat("North East",
    [P["Solway"],P["Berwick"]] +
    coast_rev(idx("Berwick"), idx("Humber")) +
    [P["Leeds"],P["Manch"],P["Solway"]]
)

# 3. North West: Pennine + Irish Sea coast CCW
R["North West"] = feat("North West",
    [P["Solway"],P["Manch"],P["Liverpool"]] +
    coast_rev(idx("Liverpool"), idx("Solway"))
)

# 4. Yorkshire: Pennine + coast CCW + Midland
R["Yorkshire"] = feat("Yorkshire",
    [P["Manch"],P["Leeds"]] +
    coast_rev(idx("Humber"), idx("Wash")) +
    [P["Bham"],P["Manch"]]
)

# 5. West Midlands: inland
R["West Midlands"] = feat("West Midlands",
    [P["Manch"],P["Bham"],P["Bristol"],P["Cardiff"],P["Liverpool"],P["Manch"]]
)

# 6. East Midlands: inland
R["East Midlands"] = feat("East Midlands",
    [P["Manch"],P["Bham"],P["London"],P["GYa"],P["Wash"],P["Leeds"],P["Manch"]]
)

# 7. East of England: CCW Wash-Dover + internal
R["East of England"] = feat("East of England",
    [P["Leeds"],P["Wash"]] +
    coast_rev(idx("Wash"), idx("Dover")) +
    [P["London"],P["Bham"],P["Leeds"]]
)

# 8. London
R["London"] = feat("London",
    [(-0.55,51.60),(-0.35,51.68),(-0.02,51.70),(0.22,51.60),
     (0.22,51.48),(0.05,51.38),(-0.18,51.36),(-0.45,51.40),
     (-0.58,51.50),(-0.55,51.60)]
)

# 9. South East: CCW Dover-Plymouth S coast + internal
R["South East"] = feat("South East",
    [P["London"],P["Dover"]] +
    coast_rev(idx("Dover"), idx("Plymouth")) +
    [P["Bristol"],P["London"]]
)

# 10. South West: CW Plymouth-Severn peninsula
R["South West"] = feat("South West",
    [P["Bristol"]] +
    coast_rev(idx("Plymouth"), idx("Severn")) +
    [P["Bristol"]]
)

# 11. Wales: CW Liverpool-Cardiff Welsh coast
R["Wales"] = feat("Wales",
    [P["Cardiff"]] +
    coast(idx("Liverpool"), idx("Cardiff")) +
    [P["Cardiff"]]
)

# 12. Northern Ireland
R["Northern Ireland"] = feat("Northern Ireland", [list(p) for p in NI])

# Save
order = ["Scotland","North East","North West","Yorkshire",
         "West Midlands","East Midlands","East of England",
         "London","South East","South West","Wales","Northern Ireland"]
feats = [R[n] for n in order]
gj = {"type":"FeatureCollection","features":feats}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT,"w",encoding="utf-8") as f:
    json.dump(gj, f, ensure_ascii=False, indent=2)

print(f"[OK] {OUT}")
tv = 0
for f in feats:
    ring = f["geometry"]["coordinates"][0]
    ok = "closed" if ring[0]==ring[-1] else "OPEN"
    v = len(ring)-1; tv += v
    lo = [p[0] for p in ring]; la = [p[1] for p in ring]
    print(f"  [{ok}] {f['properties']['name']:22s} {v:3d}v  "
          f"lon=[{min(lo):.1f},{max(lo):.1f}] lat=[{min(la):.1f},{max(la):.1f}]")
print(f"  Total: {tv}v, {os.path.getsize(OUT):,}B")
