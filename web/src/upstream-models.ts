/** 静态适配只调用不依赖Artifact模型的评分路径，完整模型方法明确不可用。 */
export const Artifact = { get():never { throw new Error('静态评分不加载机器人Artifact模型') } }

const weapons = new Map<string, any>();
/** 注册game的name武器实例，instance直接使用原版Weapon原型计算等级与精炼。 */
export function registerWeapon(game:string,name:string,instance:any):void { weapons.set(`${game}/${name}`,instance); }
/** 属性计算器只需按游戏和名称取得已加载的只读武器。 */
export const Weapon = { get(name:string,game:string):any { return weapons.get(`${game}/${name}`); } };

import { Meta } from "./upstream-bridge";
/** 按name、num和game查找原版套装buff；仅适配元数据查询，不改写加成计算。 */
export const ArtifactSet = { getArtisSetBuff(name:string,num:number,game:string):any {
  const buffs=Meta.getMeta(game,"arti","artiBuffs") || {};
  const result=buffs[name]?.[num] || buffs[name+num];
  return result ? Array.isArray(result) ? result : [result] : false;
} };
