import type { Stat } from "./types";

/** 根据stat的实际赋值次数显示后续强化次数，首次生成不计入强化。 */
export function enhancementText(stat: Stat): string {
  return stat.rollCount === undefined ? "强化次数未记录" : `强化${stat.rollCount - 1}次`;
}
