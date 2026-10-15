import "./style.css";
import "./panel.css";
import { panelHTML, escapeHTML as esc, elements } from "./panel";
import { scoreCard } from "./scoring";
import type { Snapshot } from "./types";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = '<main class="loading">正在整理角色档案…</main>';
try {
  const response = await fetch("/accounts.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("账号数据加载失败");
  const snapshot: Snapshot = await response.json();
  const cards = snapshot.accounts.flatMap((account) =>
    account.characters.map(scoreCard),
  );
  let game: "gs" | "sr" = "gs";
  let query = "";
  let element = "";
  let sort = "level";
  let onlyIncomplete = false;
  app.innerHTML = `<header><a class="brand" href="/">✦ 米游档案 <span>PERSONAL ARCHIVE</span></a><a class="source" href="https://github.com/117503445/miao-plugin/tree/feat/static-account-cards" target="_blank" rel="noreferrer">开源 ↗</a></header><main><section class="intro"><div class="eyebrow">MIAO · CHARACTER PROFILES</div><h1>我的<span>角色面板</span></h1><p>每一位同行者，都值得一张完整的配装档案。</p></section><nav class="tabs" aria-label="选择游戏"><button data-game="gs" class="active">原神 <small>GENSHIN IMPACT</small></button><button data-game="sr">崩坏：星穹铁道 <small>HONKAI: STAR RAIL</small></button></nav><section id="account" class="account"></section><section class="toolbar" aria-label="筛选角色"><label class="search">搜 <input id="search" type="search" placeholder="搜索角色、武器或套装" aria-label="搜索角色、武器或套装"></label><select id="sort" aria-label="角色排序"><option value="level">等级优先</option><option value="score">评分从高到低</option><option value="weak">评分从低到高</option><option value="name">按角色名称</option></select><label class="toggle"><input id="incomplete" type="checkbox">仅看配装缺失</label></section><div id="elements" class="elements"></div><div id="count" class="count" aria-live="polite"></div><section id="cards" class="grid"></section><footer>采用<a href="https://github.com/yoimiya-kokomi/miao-plugin" target="_blank" rel="noreferrer">喵喵插件</a>原版角色权重与评分算法 · MIT<br>评分衡量有效词条，培养时还需结合队伍、充能和循环。这里展示导出时的配装快照。</footer></main><dialog id="detail"><button class="close" aria-label="关闭详情">×</button><div id="detail-body"></div></dialog>`;
  /** 根据当前游戏与筛选条件更新角色列表。 */
  function render(): void {
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
    document.querySelector("#cards")!.innerHTML = filtered.length
      ? filtered.map((c) => panelHTML(c)).join("")
      : '<p class="empty">没有符合筛选条件的角色。</p>';
    document
      .querySelectorAll<HTMLButtonElement>("[data-game]")
      .forEach((b) => b.classList.toggle("active", b.dataset.game === game));
  }
  const dialog = document.querySelector<HTMLDialogElement>("#detail")!;
  /** 展示key对应角色的完整喵喵面板与评分权重。 */
  function showDetails(key: string): void {
    const card = cards.find((c) => c.key === key)!;
    document.querySelector("#detail-body")!.innerHTML = panelHTML(card, true);
    dialog.showModal();
  }
  document.querySelector("#search")!.addEventListener("input", (e) => {
    query = (e.target as HTMLInputElement).value;
    render();
  });
  document.querySelector("#sort")!.addEventListener("change", (e) => {
    sort = (e.target as HTMLSelectElement).value;
    render();
  });
  document.querySelector("#incomplete")!.addEventListener("change", (e) => {
    onlyIncomplete = (e.target as HTMLInputElement).checked;
    render();
  });
  app.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "button",
    );
    if (!button) return;
    if (button.dataset.game) {
      game = button.dataset.game as "gs" | "sr";
      element = "";
      render();
    } else if (button.dataset.element !== undefined) {
      element = button.dataset.element;
      render();
    } else if (button.dataset.detail) showDetails(button.dataset.detail);
    else if (button.classList.contains("close")) dialog.close();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  render();
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
