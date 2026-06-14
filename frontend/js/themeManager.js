/* Theme toggle and chart refresh hook. */
(function() {
  var html = document.documentElement;
  var btn = document.getElementById("themeToggle");
  var icon = document.getElementById("themeIcon");

  function setTheme(name) {
    var theme = name === "dark" ? "dark" : "light";
    html.setAttribute("data-theme", theme);
    window.CURRENT_THEME = theme === "dark" ? "darkDashboard" : "lightDashboard";

    if (icon) {
      icon.textContent = theme === "dark" ? "Light" : "Dark";
    }

    window.dispatchEvent(new CustomEvent("themeChanged", {
      detail: { theme: theme }
    }));
  }

  function toggleTheme() {
    var current = html.getAttribute("data-theme") || "light";
    setTheme(current === "dark" ? "light" : "dark");
  }

  if (btn) {
    btn.addEventListener("click", toggleTheme);
  }

  setTheme(html.getAttribute("data-theme") || "light");

  window.setTheme = setTheme;
  window.getCurrentTheme = function() {
    return html.getAttribute("data-theme") || "light";
  };
})();
