import assert from "node:assert/strict";
import snapshot from "../public/accounts.json";
import { scoreCard } from "./scoring";
import type { Snapshot } from "./types";

/** 验证两游戏汇总来自副词条、正确排序及格式化，并保留原版九格布局。 */
export function runSummaryTests():void {
 for (const key of ["gs-Traveler","gs-Sandrone","sr-1001"]) {
  const card=(snapshot as unknown as Snapshot).accounts.flatMap(account=>account.characters).find(card=>card.key===key)!;
  const summary=scoreCard(card,true).native!.detail.allAttr;
  assert.equal(summary.length,9,`${key}原版九格`);
  const totals:Record<string,number>={};
  for (const piece of card.artifacts) for (const stat of piece.attrs) totals[stat.key]=(totals[stat.key] || 0)+stat.value;
  const filled=summary.filter(item=>item.key);
  assert.equal(filled.length,Math.min(Object.keys(totals).length,9));
  for (const item of filled) {
   const actual=Number(item.value.replace(/[,%]/g,""));
   assert.ok(Math.abs(actual-totals[item.key])<=0.051,`${key}/${item.key}仅汇总副词条`);
   assert.notEqual(item.eff,"-",`${key}/${item.key}有效档数`);
  }
  for (let index=1;index<filled.length;index++) assert.ok(Number(filled[index-1].eff.replace(/,/g,""))>=Number(filled[index].eff.replace(/,/g,"")),"按有效档数降序");
  assert.deepEqual(scoreCard({...card,artifacts:[]},true).native!.detail.allAttr,Array.from({length:9},()=>({})),"缺装保留空格，不制造词条");
 }
 console.log("两游戏副词条汇总测试通过：合计、格式、排序、九格与缺装");
}
