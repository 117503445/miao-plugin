import "./style.css";
import "./panel.css";
import "./list.css";
import { listHTML } from "./list";
import { parseRoute, routeHash, type RouteState } from "./route";
import {
  panelHTML,
  escapeHTML as esc,
  elements,
  fitNativeFrames,
} from "./panel";
import { scoreCard } from "./scoring";
import type { Snapshot, BattleAttributes } from "./types";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = '<main class="loading">正在整理角色档案…</main>';
try {
  const [response,attrResponse] = await Promise.all([fetch("/accounts.json", { cache: "no-cache" }),fetch("/attributes.json",{cache:"no-cache"})]);
  if (!response.ok || !attrResponse.ok) throw new Error("账号或常驻属性数据加载失败");
  const snapshot: Snapshot = await response.json();
  const attributeData:{characters:Record<string,BattleAttributes>} = await attrResponse.json();
  const cards = snapshot.accounts.flatMap((account) =>
    account.characters.map((card) => {
      const battle=attributeData.characters[card.key];
      if (!battle) throw new Error(`${card.name}常驻属性数据缺失`);
      return {...scoreCard(card),battle};
    }),
  );
  let { game, query, element, sort, incomplete: onlyIncomplete, view, character, panel } = parseRoute(location.hash, localStorage.getItem("mihoyo-view") === "cards" ? "cards" : "list");
  app.innerHTML = `<header><a class="brand" href="/">✦ 米游档案 <span>PERSONAL ARCHIVE</span></a><a class="source" href="https://github.com/117503445/miao-plugin/tree/feat/static-account-cards" target="_blank" rel="noreferrer">开源 ↗</a></header><main><section class="intro"><div class="eyebrow">MIAO · CHARACTER PROFILES</div><h1>我的<span>角色面板</span></h1><p>每一位同行者，都值得一张完整的配装档案。</p></section><nav class="tabs" aria-label="选择游戏"><button data-game="gs" class="active">原神 <small>GENSHIN IMPACT</small></button><button data-game="sr">崩坏：星穹铁道 <small>HONKAI: STAR RAIL</small></button></nav><section id="account" class="account"></section><section class="toolbar" aria-label="筛选角色"><label class="search">搜 <input id="search" type="search" placeholder="搜索角色、武器或套装" aria-label="搜索角色、武器或套装"></label><select id="sort" aria-label="角色排序"><option value="level">等级优先</option><option value="score">评分从高到低</option><option value="weak">评分从低到高</option><option value="name">按角色名称</option></select><label class="toggle"><input id="incomplete" type="checkbox">仅看配装缺失</label><nav class="view-switch" aria-label="展示模式"><button data-view="list">列表</button><button data-view="cards">原版卡片</button></nav></section><div id="elements" class="elements"></div><div id="count" class="count" aria-live="polite"></div><section id="cards" class="grid"></section><footer>采用<a href="https://github.com/yoimiya-kokomi/miao-plugin" target="_blank" rel="noreferrer">喵喵插件</a>原版角色权重与评分算法 · MIT<br>评分衡量有效词条，培养时还需结合队伍、充能和循环。这里展示导出时的配装快照。</footer></main><dialog id="detail"><button class="close" aria-label="关闭详情">×</button><div id="detail-body"></div></dialog>`;
  /** 根据当前游戏与筛选条件更新角色列表。 */
  function render(): void {
    document.body.classList.toggle("list-mode", view === "list");
    const account = snapshot.accounts.find((a) => a.game === game)!;
    const gameCards = cards.filter((c) => c.game === game);
    const filtered = gameCards
      .filter(
        (c) =>
          (!element || c.element === element) &&
          (!onlyIncomplete || !c.complete) &&
          [c.name, c.weapon?.name, ...c.artifacts.map((a) => a.set)]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
      .sort((a, b) =>
        sort === "score"
          ? b.score - a.score
          : sort === "weak"
            ? a.score - b.score
            : sort === "name"
              ? a.name.localeCompare(b.name, "zh-CN")
              : b.level - a.level || b.score - a.score,
      );
    document.querySelector("#account")!.innerHTML =
      `<div><span class="label">账号 UID</span><strong>${esc(account.uid)}</strong></div><div><span class="label">角色档案</span><strong>${gameCards.length}<small> 位</small></strong></div><div><span class="label">满级角色</span><strong>${gameCards.filter((c) => c.level >= (game === "gs" ? 90 : 80)).length}<small> 位</small></strong></div><div class="snapshot"><span class="label">数据快照</span><strong>${esc(account.snapshotAt)}</strong><small>非实时数据</small></div>`;
    const available = [...new Set(gameCards.map((c) => c.element))];
    document.querySelector("#elements")!.innerHTML = ["", ...available]
      .map(
        (e) =>
          `<button data-element="${e}" class="${element === e ? "active" : ""}">${e ? elements[e] || e : "全部属性"}</button>`,
      )
      .join("");
    document.querySelector("#count")!.textContent =
      `${filtered.length} 位同行者 · ${game === "gs" ? "圣遗物" : "遗器"}喵喵评分`;
    document.querySelector("#cards")!.className = view === "list" ? "character-list" : "grid";
    document.querySelector("#cards")!.innerHTML = filtered.length
      ? view === "list" ? listHTML(filtered) : filtered.map((c) => panelHTML(c)).join("")
      : '<p class="empty">没有符合筛选条件的角色。</p>';
    fitNativeFrames(document.querySelector("#cards")!);
    document
      .querySelectorAll<HTMLButtonElement>("[data-game]")
      .forEach((b) => b.classList.toggle("active", b.dataset.game === game));
    document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach(button => {
      button.classList.toggle("active", button.dataset.view === view);
      button.setAttribute("aria-pressed", String(button.dataset.view === view));
    });
    const search = document.querySelector<HTMLInputElement>("#search")!;
    if (search.value !== query) search.value = query;
    document.querySelector<HTMLSelectElement>("#sort")!.value = sort;
    document.querySelector<HTMLInputElement>("#incomplete")!.checked = onlyIncomplete;
    document.querySelectorAll<HTMLDetailsElement>(".list-character").forEach(row => {
      row.open = row.dataset.key === character;
    });
    if (character && panel) showDetails(character, panel === "score");
    else {
      dialog.close();
      document.querySelector("#detail-body")!.innerHTML = "";
    }
  }
  const dialog = document.querySelector<HTMLDialogElement>("#detail")!;
  /** 将当前筛选和详情写入hash；replace用于初始规范化与连续输入。 */
  function navigate(replace = false): void {
    const state: RouteState = { game, query, element, sort, incomplete: onlyIncomplete, view, character, panel };
    const hash = routeHash(state);
    if (hash !== location.hash) {
      if (replace) history.replaceState(null, "", hash);
      else history.pushState(null, "", hash);
    }
    render();
  }
  /** 从浏览器hash恢复筛选、展开角色与弹窗，供直接链接及前进后退使用。 */
  function restoreRoute(): void {
    ({ game, query, element, sort, incomplete: onlyIncomplete, view, character, panel } = parseRoute(location.hash, localStorage.getItem("mihoyo-view") === "cards" ? "cards" : "list"));
    if (character && !cards.some(card => card.key === character)) {
      character = "";
      panel = "";
    }
    navigate(true);
  }
  /** 展示key对应角色的原版面板，expanded为true时展示评分详图。 */
  function showDetails(key: string, expanded = true): void {
    const card = cards.find((c) => c.key === key)!;
    document.querySelector("#detail-body")!.innerHTML = panelHTML(card, expanded);
    dialog.showModal();
    fitNativeFrames(dialog);
  }
  document.querySelector("#search")!.addEventListener("input", (e) => {
    query = (e.target as HTMLInputElement).value;
    character = "";
    panel = "";
    navigate(true);
  });
  document.querySelector("#sort")!.addEventListener("change", (e) => {
    sort = (e.target as HTMLSelectElement).value as RouteState["sort"];
    navigate();
  });
  document.querySelector("#incomplete")!.addEventListener("change", (e) => {
    onlyIncomplete = (e.target as HTMLInputElement).checked;
    navigate();
  });
  app.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "button",
    );
    if (!button) return;
    if (button.dataset.view) {
      view = button.dataset.view as "list" | "cards";
      localStorage.setItem("mihoyo-view", view);
      navigate();
    } else if (button.dataset.game) {
      game = button.dataset.game as "gs" | "sr";
      element = "";
      character = "";
      panel = "";
      navigate();
    } else if (button.dataset.element !== undefined) {
      element = button.dataset.element;
      navigate();
    } else if (button.dataset.detail || button.dataset.profile) {
      character = (button.dataset.detail || button.dataset.profile)!;
      panel = button.dataset.detail ? "score" : "profile";
      navigate();
    } else if (button.classList.contains("close")) {
      panel = "";
      navigate();
    }
  });
  app.addEventListener("toggle", (event) => {
    const row = event.target;
    if (!(row instanceof HTMLDetailsElement) || !row.matches(".list-character") || !row.isConnected) return;
    const key = row.dataset.key!;
    if (row.open && character !== key) {
      character = key;
      navigate();
    } else if (!row.open && character === key) {
      character = "";
      navigate();
    }
  }, true);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      panel = "";
      navigate();
    }
  });
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    panel = "";
    navigate();
  });
  window.addEventListener("hashchange", restoreRoute);
  restoreRoute();
  (window as any).__cardsQA = {
    counts: snapshot.accounts.map((a) => ({
      game: a.game,
      count: a.characters.length,
    })),
    nonFinite: cards.filter((c) => !Number.isFinite(c.score)).length,
    scored: cards.filter((c) => c.score > 0).length,
  };
} catch (error) {
  app.innerHTML = `<main class="loading"><h1>档案暂时无法打开</h1><p>${esc(error instanceof Error ? error.message : error)}</p></main>`;
  console.error(error);
}
