import type { ScoredCard } from "../src/types";
import { enhancementText } from "../src/enhancements";

/** 为原版html的副词条补充pieces中的强化次数，保持上游模板与评分代码原样。 */
export function appendRollLabels(html: string, pieces: ScoredCard["artifacts"]): string {
  let position = 0;
  const result = html.replace(/<ul class="detail attr(?: attr-detail)?">([\s\S]*?)<\/ul>/g, (block: string) => {
    const piece = pieces[position++];
    if (!piece) throw new Error("原版装备块与次数数据不匹配");
    let index = 0;
    const output = block.replace(/<li class="(?:great|useful|nouse)">[\s\S]*?<\/li>/g, (row: string) => {
      const stat = piece.attrs[index++];
      if (!stat) throw new Error("原版副词条与次数数据不匹配");
      return row.replace(/(<span class="val">[\s\S]*?)(<\/span>)/, `$1<small class="roll-count">${enhancementText(stat)}</small>$2`);
    });
    if (index !== piece.attrs.length) throw new Error("原版副词条次数标注不完整");
    return output;
  });
  if (position !== pieces.length) throw new Error("原版装备次数标注不完整");
  return result;
}
