import Attr from "../../models/attr/Attr.js";
import OriginalWeapon from "../../models/Weapon.js";
import { registerMetadata, Format } from "./upstream-bridge";
import { registerWeapon } from "./upstream-models";
import type { ScoredCard, BattleAttributes } from "./types";

/** 计算所需原版角色/武器与buff元数据，由构建阶段读取。 */
export interface AttributeMetadata {
  character: any;
  weapon: any | null;
  characterBuffs: any[];
  weaponBuffs: Record<string, any>;
  artifactBuffs: Record<string, any>;
}

/** 通过meta的实际level和promote取星铁等级属性，接口等同Character.getLvAttr。 */
function starrailLevel(meta:any,level:number,promote:number):Record<string,number> {
  const entry=meta.attr[promote];
  if (!entry) throw new Error("缺少对应突破等级的星铁属性");
  return Object.fromEntries(Object.entries(entry.attrs).map(([key,value])=>[key,Number(value)+(entry.grow?.[key] || 0)*(level-1)]));
}

/** 用card的真实等级、突破、装备和行迹，调用未修改的Attr原版常驻属性计算器；meta提供原版表。 */
export function calculateAttributes(card:ScoredCard,meta:AttributeMetadata):BattleAttributes {
  registerMetadata(card.game,{artiBuffs:meta.artifactBuffs});
  registerMetadata(card.game,{weaponBuffs:meta.weaponBuffs},"weapon");
  if (card.weapon) {
    if (!meta.weapon) throw new Error(`${card.name}缺少武器元数据`);
    // 不加载机器人的文件读取和定时缓存，计算方法仍由原版Weapon原型提供。
    const weapon=Object.assign(Object.create(OriginalWeapon.prototype),{game:card.game,name:meta.weapon.name,id:meta.weapon.id,type:meta.weapon.type,_detail:meta.weapon});
    registerWeapon(card.game,card.weapon.name,weapon);
  }
  const trees:string[]=[];
  if (card.game==="sr") for (let index=1;index<=10;index++) {
    if (!card.traces?.[`stat_${index}`]) continue;
    const key=Object.keys(meta.character.tree || {}).find(id=>id.endsWith(String(200+index)));
    if (!key) throw new Error(`${card.name}缺少stat_${index}的原版行迹映射`);
    trees.push(key);
  }
  const char={id:card.id,game:card.game,elem:card.element,weapon:meta.character.weapon,detail:meta.character,
    /** 查询元素elem是否与当前角色一致。 */
    isElem(elem:string):boolean {return Format.sameElem(card.element,elem);},
    /** 按level和promote取得原表中的星铁等级属性。 */
    getLvAttr(level:number,promote:number):Record<string,number> {return starrailLevel(meta.character,level,promote);},
    /** 只提供上游角色规则，是否静态由原版Attr判断。 */
    getCalcRule():any {return {buffs:meta.characterBuffs};}
  };
  const sets:Record<string,number>={};
  card.artifacts.forEach(piece=>sets[piece.set]=(sets[piece.set] || 0)+1);
  const artis={
    /** 遍历当前角色piece主副词条，fn接收原版接口需要的数据。 */
    forEach(fn:(piece:any)=>void):void {card.artifacts.forEach(fn);},
    /** 按实际套装件数向fn提供已生效的2件与4件效果。 */
    eachArtisSet(fn:(set:{name:string},num:number)=>void):void {for (const [name,num] of Object.entries(sets)) {if (num>=2) fn({name},2);if (num>=4) fn({name},4);}}
  };
  const calculator=Attr.create({game:card.game,char,level:card.level,promote:card.ascension,trees,weapon:card.weapon ? {...card.weapon,promote:card.weapon.ascension} : {},artis});
  const computed=calculator.calc();
  const values=Object.fromEntries(Object.entries(computed).filter(([,value])=>typeof value==="number")) as Record<string,number>;
  for (const [key,value] of Object.entries(values)) if (!Number.isFinite(value)) throw new Error(`${card.name}的${key}无法按原始数据计算`);
  const notes=card.ruleName==="旅行者" ? ["旅行者任务额外常驻加成未采集"] : [];
  return {values,base:calculator.getBase(),notes};
}
