import assert from "node:assert/strict";
import { calculateAttributes } from "./attributes";
import type { ScoredCard } from "./types";

/** 比较actual与expected属性值，label用于定位来源错误。 */
function near(actual:number, expected:number, label:string):void { assert.ok(Math.abs(actual-expected)<1e-7, `${label}: ${actual} != ${expected}`); }
/** 使用上游真实计算器验证等级突破、百分比基础值、静态加成和未点亮行迹。 */
export function runAttributeTests():void {
 const gs = {game:"gs",key:"gs-test",id:1,ruleName:"测试",name:"测试",level:20,ascension:0,element:"cryo",traces:{},weapon:{name:"测试武器",level:20,ascension:0,affix:1},artifacts:[{idx:1,set:"测试套装",main:{key:"hpPlus",value:100},attrs:[{key:"atk",value:20},{key:"atkPlus",value:10},{key:"cpct",value:4}]},{idx:2,set:"测试套装",main:{key:"atkPlus",value:50},attrs:[{key:"def",value:10}]}]} as unknown as ScoredCard;
 const gm = {character:{weapon:"claymore",attr:{keys:["hpBase","atkBase","defBase","atkPct"],details:{"1":[100,10,20,0],"20":[200,20,40,0],"20+":[300,30,60,0],"40":[500,50,100,0]}}},weapon:{id:1,name:"测试武器",type:"claymore",attr:{atk:{"1":50,"20":100,"20+":150,"40":200},bonusKey:"atkPct",bonusData:{"1":10,"20":20,"20+":30,"40":40}}},characterBuffs:[],weaponBuffs:{"测试武器":[{isStatic:true,refine:{atkPct:[10,10,10,10,10]}},{refine:{atkPct:[999,999,999,999,999]}}]},artifactBuffs:{"测试套装":{2:{isStatic:true,data:{atkPct:18}}}}};
 const before=calculateAttributes(gs,gm);near(before.values.hp,300,"GS实际20级生命");near(before.values.atk,261.6,"GS攻击基础值与百分比");near(before.values.def,44,"GS防御");near(before.values.cpct,9,"GS初始暴击");near(before.values.recharge,100,"GS基础充能");
 const after=calculateAttributes({...gs,ascension:1,weapon:{...gs.weapon!,ascension:1}},gm);near(after.values.hp,400,"GS20级突破后生命");near(after.values.atk,380.4,"GS武器20级突破后基础值");
 const ice=calculateAttributes(gs,{...gm,artifactBuffs:{"测试套装":{2:{isStatic:true,elem:"冰",data:{dmg:15}}}}});near(ice.values.dmg,15,"中文元素条件套装加成");
 const fire=calculateAttributes({...gs,element:"pyro"},{...gm,artifactBuffs:{"测试套装":{2:{isStatic:true,elem:"冰",data:{dmg:15}}}}});near(fire.values.dmg,0,"不同元素排除套装加成");
 const sr={...gs,game:"sr",key:"sr-test",element:"ice",level:10,ascension:0,traces:{stat_1:true,stat_2:false},weapon:{name:"测试光锥",level:10,ascension:0,affix:2},artifacts:[{idx:1,set:"测试遗器",main:{key:"hpPlus",value:10},attrs:[{key:"speed",value:3}]},{idx:2,set:"测试遗器",main:{key:"atkPlus",value:5},attrs:[]}]} as unknown as ScoredCard;
 const sm={character:{weapon:"存护",attr:{0:{attrs:{hp:100,atk:10,def:20,speed:100,cpct:5,cdmg:50},grow:{hp:2,atk:1,def:2}}},tree:{1001201:{key:"atk",value:10},1001202:{key:"speed",value:5}}},weapon:{id:2,name:"测试光锥",type:"存护",attr:{0:{attrs:{hp:50,atk:5,def:10}}},growAttr:{hp:1,atk:0.5,def:0.2},skill:{tables:{1:[10,15,20,25,30]}}},characterBuffs:[],weaponBuffs:{2:[{isStatic:true,idx:1,key:"atkPct"}]},artifactBuffs:{"测试遗器":{2:{isStatic:true,data:{speedPct:6}}}}};
 const stats=calculateAttributes(sr,sm);near(stats.values.hp,187,"SR角色和光锥实际等级");near(stats.values.atk,40.625,"SR已点亮行迹与叠影");near(stats.values.speed,109,"SR未点亮速度行迹不计");
 const mismatch=calculateAttributes(sr,{...sm,weapon:{...sm.weapon,type:"虚无"}});near(mismatch.values.atk,36.35,"SR错误命途不生效光锥被动");
 console.log("原版属性计算集成测试通过：实际等级/突破、静态套装、精炼/叠影、行迹开关、命途匹配及触发Buff排除");
}
