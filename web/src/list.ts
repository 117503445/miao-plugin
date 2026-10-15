import { elements, escapeHTML as esc } from "./panel";
import type { ScoredCard, Stat } from "./types";
import { enhancementCount, enhancementText } from "./enhancements";

const labels: Record<string, string> = {
  hpPlus: "生命值", hp: "生命值", atkPlus: "攻击力", atk: "攻击力",
  defPlus: "防御力", def: "防御力", cpct: "暴击率", cdmg: "暴击伤害",
  mastery: "元素精通", recharge: "元素充能效率", speed: "速度",
  stance: "击破特攻", effPct: "效果命中", effDef: "效果抵抗", heal: "治疗加成",
};
const flat = new Set(["hpPlus", "atkPlus", "defPlus", "mastery", "speed"]);
/** 按固定部位顺序显示card的单件评分，未装备的位置保留占位。 */
function pieceScoresHTML(card: ScoredCard): string {
  const names = card.game === "gs" ? ["花", "羽", "沙", "杯", "冠"] : ["头", "手", "衣", "鞋", "球", "绳"];
  return `<span class="list-piece-scores" aria-label="逐件装备评分">${names.map((name, index) => {
    const piece = card.artifacts.find(item => item.idx === index + 1);
    return `<span class="piece-score-cell" title="${esc(piece ? `${piece.name}：${piece.score.toFixed(1)}分 ${piece.grade}` : `${name}：未装备`)}"><small>${name}</small><b>${piece ? piece.score.toFixed(1) : "—"}</b></span>`;
  }).join("")}</span>`;
}
/** 将stat转换为能区分固定值和百分比的词条文本。 */
function statText(stat: Stat): string {
  const name = labels[stat.key] || (elements[stat.key] ? `${elements[stat.key]}伤加成` : stat.key);
  return `${name} +${Number(stat.value.toFixed(1))}${flat.has(stat.key) ? "" : "%"}`;
}
/** 生成card的纯文本配装详情，保留逐件得分及原版规则权重。 */
function equipmentHTML(card: ScoredCard): string {
  return `<div class="list-equipment">${card.artifacts.map(piece => `<section class="list-piece"><div class="list-piece-heading"><strong>${esc(piece.name)} +${piece.level}</strong><b>${piece.score.toFixed(1)} · ${esc(piece.grade)}</b></div><p>${esc(piece.set)} · ${esc(statText(piece.main))}</p><ul>${piece.attrs.map(stat => `<li class="${card.weights[stat.key] > 0 ? "effective" : "ineffective"}"><small class="stat-enhancements" title="${esc(enhancementText(stat))}">${enhancementCount(stat)}</small>${esc(statText(stat))}${card.weights[stat.key] > 0 ? "" : "（不计分）"}</li>`).join("")}</ul></section>`).join("")}</div><p class="list-rule">评分规则：${esc(card.rule)}。权重：${Object.entries(card.weights).filter(([key]) => !key.endsWith("Plus")).map(([key, weight]) => `${esc(labels[key] || key)} ${weight}`).join(" / ")}。强化次数不含词条首次生成；首次生成后每提升一次记1次。花、羽的固定主词条不计分；评分用于衡量有效词条。</p>`;
}
/** 用cards生成可展开的简洁列表，详情按钮继续打开原版模板。 */
export function listHTML(cards: ScoredCard[]): string {
  return `<div class="list-heading" aria-hidden="true"><span>角色</span><span>等级 / 命座</span><span>武器 / 光锥</span><span>技能等级</span><span>配装评分</span><span>各件评分</span></div>${cards.map(card => `<details class="list-character" data-key="${esc(card.key)}"><summary><span class="list-name">${esc(card.name)}<small>${esc(elements[card.element])} · ${card.game === "gs" ? "原神" : "星铁"}</small></span><span>Lv.${card.level}<small>${card.cons}${card.game === "gs" ? "命" : "魂"}</small></span><span class="list-weapon">${esc(card.weapon?.name || "未装备")}<small>${card.weapon ? `Lv.${card.weapon.level} · ${card.weapon.affix}${card.game === "gs" ? "精" : "叠"}` : "—"}</small></span><span class="list-talents" title="${esc(card.talents.map(t => `${t.name} ${t.level}`).join(" / "))}">${card.talents.map(t => t.level).join(" / ")}</span><span class="list-score">${card.score.toFixed(1)} <b>${esc(card.grade)}</b><small>${card.artifacts.length}/${card.game === "gs" ? 5 : 6}件 · 展开词条</small></span>${pieceScoresHTML(card)}</summary><div class="list-expanded"><p class="list-talent-note">技能（导出基础等级）：${card.talents.map(t => `${esc(t.name)} ${t.level}`).join(" / ")}</p>${equipmentHTML(card)}<div class="list-actions"><button data-profile="${esc(card.key)}">原版角色面板</button><button data-detail="${esc(card.key)}">原版评分详图</button></div></div></details>`).join("")}`;
}
