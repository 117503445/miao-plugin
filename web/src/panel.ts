import type { ScoredCard, Stat } from "./types";

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
const themes: Record<string, string> = {
  fire: "pyro",
  ice: "cryo",
  elec: "electro",
  wind: "anemo",
  imaginary: "geo",
  phy: "sr",
};
const names: Record<string, string> = {
  hp: "生命值",
  hpPlus: "生命值",
  atk: "攻击力",
  atkPlus: "攻击力",
  def: "防御力",
  defPlus: "防御力",
  cpct: "暴击率",
  cdmg: "暴击伤害",
  mastery: "元素精通",
  recharge: "充能效率",
  heal: "治疗加成",
  speed: "速度",
  effPct: "效果命中",
  effDef: "效果抵抗",
  stance: "击破特攻",
  ...Object.fromEntries(
    Object.entries(elements).map(([key, name]) => [key, `${name}伤加成`]),
  ),
};
/** 将value转义为HTML文本。 */
export function escapeHTML(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
/** 以喵喵词条格式显示stat的数值，保留导出精度。 */
export function statValue(stat: Stat): string {
  return (
    stat.value.toLocaleString("zh-CN", {
      maximumFractionDigits: [
        "hpPlus",
        "atkPlus",
        "defPlus",
        "mastery",
      ].includes(stat.key)
        ? 0
        : 1,
    }) +
    (["hpPlus", "atkPlus", "defPlus", "mastery", "speed"].includes(stat.key)
      ? ""
      : "%")
  );
}
/** 输出src素材及alt说明，className用于面板布局；缺图不创建无效请求。 */
function image(src: string, alt: string, className = ""): string {
  return src
    ? `<img src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" class="${className}" loading="lazy">`
    : "";
}
/** 输出card的喵喵风格面板，expanded表示详情模式。 */
export function panelHTML(card: ScoredCard, expanded = false): string {
  const e = escapeHTML,
    theme = themes[card.element] || card.element || "sr",
    equipment = card.game === "gs" ? "圣遗物" : "遗器",
    consName = card.game === "gs" ? "命" : "魂";
  const sets = Object.entries(
    card.artifacts.reduce<Record<string, number>>((ret, p) => {
      ret[p.set] = (ret[p.set] || 0) + 1;
      return ret;
    }, {}),
  ).map(([name, count]) => `${name} ×${count}`);
  return `<article class="miao-panel theme-${theme} ${expanded ? "expanded" : ""}" data-key="${e(card.key)}" style="--panel-bg:url('/theme/bg-${theme}.webp');--talent-bg:url('/theme/talent-${theme}.webp')"><div class="panel-hero">${image(card.banner || card.image, card.name + "角色立绘", "splash")}<div class="hero-shade"></div><div class="hero-caption"><span class="panel-element">${e(elements[card.element] || card.element)} · ${e(card.game === "gs" ? "原神" : card.path)}</span><h2>${e(card.name)}</h2><div class="hero-level">Lv.${card.level} <span class="constellation">${card.cons}${consName}</span></div><div class="talent-orbs">${card.talents.map((t) => `<div class="talent-orb ${t.level >= 10 ? "crowned" : ""}"><b>${t.level}</b><span>${e(t.name)}</span></div>`).join("")}</div><div class="weapon-panel">${card.weapon ? `${image(card.weapon.image, card.weapon.name, "weapon-art")}<div><strong>${e(card.weapon.name)}</strong><div class="stars">${"★".repeat(card.weapon.star)}</div><span>Lv.${card.weapon.level} <em>${card.game === "gs" ? "精炼" : "叠影"} ${card.weapon.affix}</em></span></div>` : `<p>${card.game === "gs" ? "武器" : "光锥"}未导出 / 无装备记录</p>`}</div></div><div class="constellation-dots" aria-label="${card.cons}${consName}">${Array.from({ length: 6 }, (_, i) => `<span class="${i < card.cons ? "unlocked" : ""}">✧</span>`).join("")}</div><span class="hero-stamp">账号配装快照</span></div><div class="panel-content"><div class="panel-score"><div><span>${equipment}总分</span><strong>${card.score.toFixed(1)}</strong></div><div><span>${equipment}评级</span><strong class="grade-${card.grade}">${card.complete ? card.grade : "待完善"}</strong></div><p>评分规则：${e(card.rule || "角色默认权重")}</p></div><div class="panel-sets">${sets.map((s) => `<span>${e(s)}</span>`).join("") || "尚无装备记录"}</div><div class="artifact-board">${card.artifacts.map((p) => `<section class="artifact-tile"><div class="artifact-top">${image(p.image, p.name, "artifact-art")}<span class="artifact-level">+${p.level}</span><h3>${e(p.name)}</h3><span class="artifact-grade grade-${p.grade}">${p.score.toFixed(1)} 分 · ${p.grade}</span></div><div class="artifact-main"><span>${e(names[p.main.key] || p.main.key)}</span><b>${statValue(p.main)}</b></div><ul>${p.attrs.map((s) => `<li class="${card.weights[s.key] >= 80 ? "great" : card.weights[s.key] > 0 ? "useful" : "nouse"}"><span>${e(names[s.key] || s.key)}</span><b>+${statValue(s)}</b></li>`).join("")}</ul></section>`).join("")}${!card.complete ? `<div class="panel-missing">已导出 ${card.artifacts.length}/${card.game === "gs" ? 5 : 6} 件${equipment}<br>配装尚不完整</div>` : ""}</div>${
    expanded
      ? `<div class="panel-method"><p>有效词条以金色／绿色区分，灰色为当前规则不计分的属性。</p><div class="weight-list">${Object.entries(
          card.weights,
        )
          .filter(([, weight]) => weight > 0)
          .map(
            ([key, weight]) =>
              `<span>${e(names[key] || key)} <b>${weight}</b></span>`,
          )
          .join(
            "",
          )}</div><p>整套评级按五／六个部位平均。评分不等同于角色伤害，未模拟队伍和临时战斗增益。</p>${card.notes.map((n) => `<p>${e(n)}</p>`).join("")}</div>`
      : `<button class="panel-open" data-detail="${e(card.key)}">展开角色面板与评分权重 <span>↗</span></button>`
  }<div class="panel-credit">喵喵角色面板 · MIHOYO ARCHIVE</div></div></article>`;
}
