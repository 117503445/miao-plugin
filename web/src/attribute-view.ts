import type { ScoredCard, BattleAttributes } from "./types";
import { escapeHTML as esc } from "./panel";

const labels:Record<string,string>={hp:"生命值",atk:"攻击力",def:"防御力",speed:"速度",mastery:"元素精通",cpct:"暴击率",cdmg:"暴击伤害",recharge:"元素充能",dmg:"伤害加成",heal:"治疗加成",stance:"击破特攻",effPct:"效果命中",effDef:"效果抵抗",joy:"欢愉度"};
/** 格式化key属性的value，沿用原版生命整数、其余一位小数/百分比的口径。 */
function display(key:string,value:number):string {
  const flat=["hp","atk","def","speed","mastery"].includes(key);
  return value.toLocaleString("zh-CN",{maximumFractionDigits:key==="hp" ? 0 : 1})+(flat ? "" : "%");
}
/** 将panel转换为原版模板attr字段；game区分物伤优先规则与显示项。 */
export function nativeAttributes(panel:BattleAttributes,game:"gs"|"sr"):Record<string,string> {
  const result:Record<string,string>={};
  for (const key of Object.keys(labels)) {
    const actual=key==="dmg" && game==="gs" && panel.values.phy>panel.values.dmg ? "phy" : key;
    const value=panel.values[actual] || 0,base=panel.base[actual] || 0;
    result[key]=display(key,value);result[key+"Base"]=display(key,base);result[key+"Plus"]=display(key,value-base);
  }
  return result;
}
/** 在card的列表详情显示离线常驻属性及数据范围，数值来自原版计算器输出。 */
export function attributesHTML(card:ScoredCard):string {
  if (!card.battle) throw new Error(`${card.name}尚未生成常驻属性`);
  const values=nativeAttributes(card.battle,card.game);
  const keys=card.game==="gs" ? ["hp","atk","def","mastery","cpct","cdmg","recharge","dmg"] : ["hp","atk","def","speed","cpct","cdmg","dmg","stance","effPct","effDef","heal"];
  if (card.game==="gs" && card.battle.values.heal) keys.push("heal");
  if (card.battle.values.joy) keys.push("joy");
  return `<section class="battle-attributes"><h3>常驻属性</h3><dl>${keys.map(key=>`<div><dt>${esc(labels[key])}</dt><dd>${esc(values[key])}</dd></div>`).join("")}</dl><p>按当前配装离线计算，不含队伍及战斗触发加成。${card.battle.notes.map(esc).join("；")}</p></section>`;
}
