/** Hash路由保存可分享的游戏、展示方式、筛选和当前角色详情。 */
export interface RouteState {
  game: "gs" | "sr";
  view: "list" | "cards";
  query: string;
  element: string;
  sort: "level" | "score" | "weak" | "name";
  incomplete: boolean;
  character: string;
  panel: "" | "profile" | "score";
}

const gameElements = {
  gs: ["pyro", "hydro", "cryo", "electro", "anemo", "geo", "dendro"],
  sr: ["fire", "ice", "elec", "wind", "quantum", "imaginary", "phy"],
};

/** 解析hash；仅空路由使用defaultView偏好，链接中的状态优先。 */
export function parseRoute(hash: string, defaultView: RouteState["view"] = "list"): RouteState {
  const [path, query = ""] = hash.replace(/^#/, "").split("?", 2);
  const [, gameKey, viewKey] = path.split("/");
  const params = new URLSearchParams(query);
  const game = gameKey === "sr" ? "sr" : "gs";
  const view = !hash ? defaultView : viewKey === "cards" ? "cards" : "list";
  const sortKey = params.get("sort");
  const sort = sortKey === "score" || sortKey === "weak" || sortKey === "name" ? sortKey : "level";
  const element = params.get("element") || "";
  const key = params.get("character") || "";
  const character = key.startsWith(game + "-") && /^[a-zA-Z0-9-]+$/.test(key) ? key : "";
  const panelKey = params.get("panel");
  const panel = character && (panelKey === "score" || panelKey === "profile") ? panelKey : "";
  return { game, view, query: params.get("q") || "", element: gameElements[game].includes(element) ? element : "", sort, incomplete: params.get("incomplete") === "1", character, panel };
}

/** 将state编码成稳定的hash链接，省略默认筛选项。 */
export function routeHash(state: RouteState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.element) params.set("element", state.element);
  if (state.sort !== "level") params.set("sort", state.sort);
  if (state.incomplete) params.set("incomplete", "1");
  if (state.character) params.set("character", state.character);
  if (state.character && state.panel) params.set("panel", state.panel);
  return `#/${state.game}/${state.view}${params.size ? "?" + params.toString() : ""}`;
}
