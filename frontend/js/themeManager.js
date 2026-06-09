/* ============================================================
   themeManager.js — 亮/暗主题切换控制器
   切换时：更新 CSS data-theme → 更新 CURRENT_THEME → 重渲全部图表
   ============================================================ */

(function () {
  const html  = document.documentElement;
  const btn   = document.getElementById("themeToggle");
  const icon  = document.getElementById("themeIcon");

  /** 设置主题 */
  function setTheme(name) {
    html.setAttribute("data-theme", name);
    CURRENT_THEME = name === "dark" ? "darkDashboard" : "lightDashboard";
    if (icon) icon.textContent = name === "dark" ? "☀️" : "🌙";
    // 触发自定义事件，通知 main.js 重渲所有图表
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme: name } }));
  }

  /** 切换 */
  function toggleTheme() {
    const cur = html.getAttribute("data-theme") || "light";
    setTheme(cur === "dark" ? "light" : "dark");
  }

  if (btn) btn.addEventListener("click", toggleTheme);

  // 暴露到全局
  window.setTheme = setTheme;
  window.getCurrentTheme = () => html.getAttribute("data-theme") || "light";
})();
