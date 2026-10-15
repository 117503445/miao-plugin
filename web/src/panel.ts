import type { ScoredCard } from "./types";

export const elements: Record<string, string> = {
  pyro: "火",
  hydro: "水",
  cryo: "冰",
  electro: "雷",
  anemo: "风",
  geo: "岩",
  dendro: "草",
  fire: "火",
  ice: "冰",
  elec: "雷",
  wind: "风",
  quantum: "量子",
  imaginary: "虚数",
  phy: "物理",
};
/** 将value转义为网页文本。 */
export function escapeHTML(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
/** 嵌入card对应的原版模板静态页，expanded表示原版评分详图。 */
export function panelHTML(card: ScoredCard, expanded = false): string {
  const path = `/${expanded ? "scores" : "profiles"}/${encodeURIComponent(card.key)}.html`,
    width = expanded ? 660 : 600;
  return `<article class="native-card ${expanded ? "native-expanded" : ""}" data-key="${escapeHTML(card.key)}"><div class="native-viewport" data-native-width="${width}"><iframe title="${escapeHTML(card.name)}${expanded ? "原版评分详图" : "原版角色面板"}" src="${path}" loading="lazy" width="${width}" scrolling="no"></iframe></div><div class="native-actions">${expanded ? `<a href="/profiles/${encodeURIComponent(card.key)}.html" target="_blank" rel="noreferrer">查看原版角色面板 ↗</a>` : `<button data-detail="${escapeHTML(card.key)}">原版评分详图与规则 ↗</button>`}<a href="${path}" target="_blank" rel="noreferrer">单独打开原图面板 ↗</a></div></article>`;
}
/** 将iframe的原始宽高按网页容器等比缩放，root为新增面板的父容器。 */
export function fitNativeFrames(root: ParentNode): void {
  root.querySelectorAll<HTMLIFrameElement>("iframe").forEach((frame) => {
    const viewport = frame.parentElement!,
      nativeWidth = Number(viewport.dataset.nativeWidth);
    /** 根据原版页面内容高度更新容器，避免移动端裁剪。 */
    function fit(): void {
      const document = frame.contentDocument;
      if (!document?.querySelector("#container")) return;
      const height =
        Math.ceil(
          document.querySelector<HTMLElement>("#container")!.offsetHeight,
        ) + 8;
      const scale = viewport.clientWidth / nativeWidth;
      frame.style.height = `${height}px`;
      frame.style.transform = `scale(${scale})`;
      viewport.style.height = `${height * scale}px`;
    }
    frame.addEventListener("load", () => {
      fit();
      void frame.contentDocument?.fonts.ready.then(fit);
    });
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
  });
}
