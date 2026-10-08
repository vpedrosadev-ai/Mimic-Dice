const path = window.location.pathname.replace(/\/+$/, "");
const view = new URLSearchParams(window.location.search).get("view");

if (view === "monsters-league" || path === "/multiplayer/monsters-league" || path.endsWith("/multiplayer/monsters-league")) {
  import("./multiplayer/monstersLeagueApp.js");
} else {
  import("./main.js");
}
