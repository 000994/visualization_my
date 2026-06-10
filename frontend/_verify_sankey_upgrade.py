import re

# ========== Verify sankeyChart.js ==========
with open('js/charts/sankeyChart.js', 'r', encoding='utf8') as f:
    sc = f.read()

sankey_checks = [
    ("1. filter buttons init called", "_initSankeyFilters()" in sc),
    ("2. _initSankeyFilters function", "function _initSankeyFilters()" in sc),
    ("3. Three filter buttons (All/Fatal/Night)", sc.count("sankey__filter-btn") >= 3),
    ("4. All button active init", 'sankey__filter-btn--active' in sc),
    ("5. Filter on click calls setFilterType", 'SankeyLinkage.setFilterType' in sc),
    ("6. Filter + year selection stack", 'filteredEntry = window.SankeyLinkage' in sc),
    ("7. Node selected highlight (borderColor #ffa726)", 'borderColor' in sc and '"#ffa726"' in sc),
    ("8. Selected node opacity 1", 'opacity: 1' in sc),
    ("9. Non-selected node opacity 0.3", 'opacity: 0.3' in sc),
    ("10. Selected links filtered by source/target", 'l.source === selectedName || l.target === selectedName' in sc),
    ("11. Empty data handling", '"No matching data"' in sc),
    ("12. _clearSelectedNode function", 'function _clearSelectedNode()' in sc),
    ("13. _sankeySelectedNodeName variable", '_sankeySelectedNodeName' in sc),
    ("14. Node click clears if re-clicked", '_sankeySelectedNodeName === nodeName' in sc),
    ("15. Deselect dispatches event", 'sankeyNodeDeselected' in sc),
    ("16. Select dispatches event", 'sankeyNodeSelected' in sc),
    ("17. _bindSankeyNodeClick function", 'function _bindSankeyNodeClick()' in sc),
    ("18. Click re-bind after setOption", '_bindSankeyNodeClick()' in sc),
    ("19. Original node drag behavior preserved", 'layout: "none"' in sc),
    ("20. Original year selector preserved", 'sankeyYearSelector' in sc),
    ("21. Original controls preserved", 'sankey__controls' in sc),
    ("22. Original tooltip preserved", 'trigger: "item"' in sc),
    ("23. Subtitle shows filter + selected info", 'filterLabel' in sc and 'selectedName' in sc),
]

print("=== sankeyChart.js Verification ===")
all_pass = True
for name, ok in sankey_checks:
    if not ok: all_pass = False
    print(f"  [{'OK' if ok else 'FAIL'}] {name}")

# ========== Verify sankeyLinkage.js ==========
with open('js/charts/sankeyLinkage.js', 'r', encoding='utf8') as f:
    sl = f.read()

linkage_checks = [
    ("1. getFilteredSankeyData", 'function getFilteredSankeyData' in sl),
    ("2. getFilteredPoints", 'function getFilteredPoints' in sl),
    ("3. getFilteredDistrict", 'function getFilteredDistrict' in sl),
    ("4. getNodeCategory", 'function _getNodeCategory' in sl),
    ("5. Fatal filter logic", 'filterType === "fatal"' in sl),
    ("6. Night filter logic", 'filterType === "night"' in sl),
    ("7. Night light labels", 'Darkness - no lighting' in sl),
    ("8. District TOP10 calc", 'districtCounts' in sl),
    ("9. Exposed to window", 'window.SankeyLinkage' in sl),
]

print("\n=== sankeyLinkage.js Verification ===")
for name, ok in linkage_checks:
    if not ok: all_pass = False
    print(f"  [{'OK' if ok else 'FAIL'}] {name}")

# ========== Verify mapChart.js ==========
with open('js/charts/mapChart.js', 'r', encoding='utf8') as f:
    mc = f.read()

map_checks = [
    ("1. highlightMapPoints function", 'function highlightMapPoints' in mc),
    ("2. clearMapHighlight function", 'function clearMapHighlight' in mc),
    ("3. Matched points highlight (fillOpacity 1)", 'fillOpacity: 1' in mc),
    ("4. Unmatched points dim (fillOpacity 0.08)", 'fillOpacity: 0.08' in mc),
    ("5. Highlight brings to front", 'bringToFront()' in mc),
    ("6. Exposed to window", 'window.highlightMapPoints' in mc and 'window.clearMapHighlight' in mc),
]

print("\n=== mapChart.js Verification ===")
for name, ok in map_checks:
    if not ok: all_pass = False
    print(f"  [{'OK' if ok else 'FAIL'}] {name}")

# ========== Verify main.js ==========
with open('js/main.js', 'r', encoding='utf8') as f:
    mjs = f.read()

main_checks = [
    ("1. sankeyNodeSelected listener", 'sankeyNodeSelected' in mjs),
    ("2. sankeyNodeDeselected listener", 'sankeyNodeDeselected' in mjs),
    ("3. highlightMapPoints called on select", 'highlightMapPoints' in mjs),
    ("4. clearMapHighlight called on deselect", 'clearMapHighlight' in mjs),
    ("5. switchToDistrictTab function", 'function switchToDistrictTab' in mjs),
    ("6. Tab click for district", 'tabDistrict' in mjs or 'tabDistrict' in mjs),
    ("7. getCurrentMapPoints function", 'function getCurrentMapPoints' in mjs),
    ("8. Fallback to original district_top10", 'gData.district_top10' in mjs),
]

print("\n=== main.js Verification ===")
for name, ok in main_checks:
    if not ok: all_pass = False
    print(f"  [{'OK' if ok else 'FAIL'}] {name}")

# ========== Verify index.html ==========
with open('index.html', 'r', encoding='utf8') as f:
    ih = f.read()

html_checks = [
    ("1. sankeyLinkage.js loaded", 'sankeyLinkage.js' in ih),
]

print("\n=== index.html Verification ===")
for name, ok in html_checks:
    if not ok: all_pass = False
    print(f"  [{'OK' if ok else 'FAIL'}] {name}")

print(f"\n{'='*40}")
print(f"Overall: {'ALL CHECKS PASS' if all_pass else 'SOME CHECKS FAILED'}")
print(f"{'='*40}")
