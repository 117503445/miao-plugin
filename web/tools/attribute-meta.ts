import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import type { Card } from "../src/types";
import gsBuffs from "../../resources/meta-gs/artifact/calc.js";
import srBuffs from "../../resources/meta-sr/artifact/calc.js";
import { weaponType } from "../../resources/meta-gs/weapon/extra.js";

/** 构建时读取resources原版属性表；server用于执行同一仓库原版buff模块。 */
export async function attributeMetadata(resources:string,server:ViteDevServer) {
  const weapons=new Map<string,any>();
  const buffs:Record<string,Record<string,any>>={gs:{},sr:{}};
  for (const game of ["gs","sr"]) {
    const root=join(resources,`meta-${game}/weapon`);
    for (const file of await readdir(root,{recursive:true})) if (file.endsWith("/data.json")) {
      const data=JSON.parse(await readFile(join(root,file),"utf8"));
      weapons.set(`${game}/${data.name}`,{...data,type:data.type || file.split("/")[0]});
    }
    for (const type of game==="gs" ? Object.keys(weaponType) : ["存护","丰饶","毁灭","记忆","同谐","虚无","巡猎","智识","欢愉"]) {
      const module=await server.ssrLoadModule("/@fs"+join(root,type,"calc.js"));
      // 这些工厂只适配原版index.js依赖的构造接口，具体buff规则直接执行上游代码。
      const result=game==="gs" ? module.default(step,staticStep) : module.default(staticIndex,dynamicIndex);
      for (const [name,value] of Object.entries(result)) {
        const weapon=weapons.get(`${game}/${name}`);
        if (game==="sr" && !weapon) throw new Error(`光锥规则无法关联：${name}`);
        buffs[game][game==="gs" ? name : weapon.id]=value;
      }
    }
  }
  return {
    /** 为card提供实际命途/元素的元数据，避免旅行者使用空通用表。 */
    async get(card:Card):Promise<any> {
      const root=join(resources,`meta-${card.game}/character`,card.ruleName);
      let character=JSON.parse(await readFile(join(root,"data.json"),"utf8"));
      if (card.ruleName==="旅行者") character={...character,...JSON.parse(await readFile(join(root,card.element,"data.json"),"utf8"))};
      let characterBuffs:any[]=[];
      if (card.game==="gs") {
        const module=await server.ssrLoadModule("/@fs"+join(root,card.ruleName==="旅行者" ? card.element : "","calc.js"));
        characterBuffs=module.buffs || [];
      }
      return {character,weapon:card.weapon ? weapons.get(`${card.game}/${card.weapon.name}`) : null,characterBuffs,weaponBuffs:buffs[card.game],artifactBuffs:card.game==="gs" ? gsBuffs : srBuffs};
    }
  };
}
/** 生成原版武器五级精炼序列；start为初值，increment省略时按原版默认四分之一。 */
function step(start:number,increment=0):number[] {return Array.from({length:6},(_,index)=>start+(increment || start/4)*index);}
/** 适配原版GS静态武器工厂，key属性、start初值、increment精炼步长。 */
function staticStep(key:string,start:number,increment?:number):any {return {isStatic:true,refine:{[key]:step(start,increment)}};}
/** 适配原版SR常驻属性，idx为技能表索引、key为属性。 */
function staticIndex(idx:number,key:string):any {return {isStatic:true,idx,key};}
/** 保留原版动态规则结构，title说明、key属性或索引表、idx技能表索引；Attr会排除它们。 */
function dynamicIndex(title:string,key:any,idx:number):any {
  if (typeof key==="object") return (tables:any)=>({title,data:Object.fromEntries(Object.entries(key).map(([name,index])=>[name,tables[String(index)]]))});
  return {title,idx,key};
}
