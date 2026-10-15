import ArtisMark from "../../models/artis/ArtisMark.js";
import ArtisMarkCfg from "../../models/artis/ArtisMarkCfg.js";
import ArtisAttr from "../../models/artis/ArtisAttr.js";
import Artis from "../../models/artis/Artis.js";
import * as gsMeta from "../../resources/meta-gs/artifact/extra.js";
import * as srMeta from "../../resources/meta-sr/artifact/meta.js";
import { usefulAttr as gsWeights } from "../../resources/meta-gs/artifact/artis-mark.js";
import { usefulAttr as srWeights } from "../../resources/meta-sr/artifact/artis-mark.js";
import { setAbbr as gsAbbr } from "../../resources/meta-gs/artifact/alias.js";
import srExtra from "../../resources/meta-sr/artifact/meta.json";
import gsBuffs from "../../resources/meta-gs/artifact/calc.js";
import { Format, registerMetadata } from "./upstream-bridge";
import type { Artifact, Card, ScoredCard, Stat } from "./types";

registerMetadata("gs", { ...gsMeta, usefulAttr: gsWeights });
registerMetadata("sr", { ...srMeta, usefulAttr: srWeights, metaData: srExtra });
/** 上游角色专属规则直接参与构建，不复制或重写规则。 */
const rules = import.meta.glob(
  "../../resources/meta-{gs,sr}/character/*/artis.js",
  { eager: true, import: "default" },
) as Record<string, (profile: any) => any>;

/** 用上游属性计算器补全artifact的主属性值，game为两游戏标识。 */
function mainStat(artifact: Artifact, game: "gs" | "sr"): Stat {
  const mainMap =
    game === "gs" ? gsMeta.mainIdMap : srExtra.mainIdx[artifact.idx];
  const entry = Object.entries(mainMap).find(
    ([, key]) => key === artifact.main.key,
  );
  if (!entry)
    throw new Error(`${artifact.name}主词条无法映射：${artifact.main.key}`);
  return ArtisAttr.getData(
    {
      mainId: entry[0],
      attrIds: [],
      level: artifact.level,
      star: artifact.star,
    },
    artifact.idx,
    game,
  ).main;
}
/** 调用喵喵原版分档，处理上游70分边界没有返回评级的情况。 */
function grade(score: number): string {
  return score >= 70 ? "MAX" : ArtisMark.getMarkClass(score);
}
/** 对card计算原版喵喵分数，返回可显示的逐件分与规则说明。 */
export function scoreCard(card: Card, native = false): ScoredCard {
  const pieces = card.artifacts
    .map((piece) => ({ ...piece, main: mainStat(piece, card.game) }))
    .sort((a, b) => a.idx - b.idx);
  const sets: Record<string, number> = {};
  pieces.forEach((piece) => (sets[piece.set] = (sets[piece.set] || 0) + 1));
  const attr = { ...card.attr };
  if (card.weapon?.bonus?.key)
    attr[card.weapon.bonus.key] =
      (attr[card.weapon.bonus.key] || 0) + card.weapon.bonus.value;
  for (const piece of pieces)
    for (const stat of [piece.main, ...piece.attrs])
      attr[stat.key] = (attr[stat.key] || 0) + stat.value;
  if (card.game === "gs")
    for (const [name, count] of Object.entries(sets))
      for (const [need, buff] of Object.entries(gsBuffs[name] || {})) {
        if (count >= Number(need) && (buff as any).isStatic)
          for (const [key, value] of Object.entries((buff as any).data || {}))
            attr[key] = (attr[key] || 0) + Number(value);
      }
  const artis = {
    /** 遍历已装备piece，idx为喵喵部位编号。 */
    forEach(fn: (piece: Artifact, idx: number) => void) {
      pieces.forEach((piece) => fn(piece, piece.idx));
    },
    /** 检查check中的套装简称或pos部位的主词条，与上游Artis.is语义一致。 */
    is(check: string, pos?: number | string) {
      if (pos)
        return String(pos)
          .split(",")
          .every((p) =>
            check
              .split(",")
              .some(
                (key) =>
                  pieces.find((x) => x.idx === Number(p))?.main.key === key ||
                  (key === "dmg" &&
                    Format.isElem(
                      pieces.find((x) => x.idx === Number(p))?.main.key || "",
                    )),
              ),
          );
      return check
        .split(",")
        .some((token) =>
          Object.entries(sets).some(([name, count]) =>
            [
              name + (count >= 4 ? "4" : count >= 2 ? "2" : ""),
              (gsAbbr[name] || name) +
                (count >= 4 ? "4" : count >= 2 ? "2" : ""),
            ].includes(token),
          ),
        );
    },
    /** 提供评分结果需要的套装计数与名称。 */
    getSetData() {
      return { sets, names: Object.keys(sets), imgs: [] };
    },
    mark: 0,
    markClass: "",
  };
  const char = {
    game: card.game,
    isGs: card.game === "gs",
    name: card.ruleName,
    abbr: card.name,
    baseAttr: card.baseAttr,
    getArtisCfg: () =>
      rules[
        `../../resources/meta-${card.game}/character/${card.ruleName}/artis.js`
      ],
  };
  const profile = {
    id: card.id,
    isProfile: true,
    isGs: card.game === "gs",
    game: card.game,
    elem: card.element,
    cons: card.cons,
    attr,
    weapon: { name: card.weapon?.name || "", affix: card.weapon?.affix || 1 },
    char,
    artis,
  };
  const detail = ArtisMark.getMarkDetail(profile, false);
  const config = ArtisMarkCfg.getCfg(profile);
  const complete = pieces.length === (card.game === "gs" ? 5 : 6);
  const artifacts = pieces.map((piece) => ({
    ...piece,
    score: Number(detail.artis[piece.idx]._mark),
    grade: grade(Number(detail.artis[piece.idx]._mark)),
  }));
  const result: ScoredCard = {
    ...card,
    score: Number(detail._mark),
    grade: complete
      ? grade(Number(detail._mark) / (card.game === "gs" ? 5 : 6))
      : "待完善",
    complete,
    rule: detail.classTitle,
    weights: Object.fromEntries(
      Object.entries(config.attrs).map(([key, value]) => [
        key,
        (value as any).weight,
      ]),
    ),
    artifacts,
  };
  if (native)
    result.native = {
      config,
      titles: ArtisMark.getKeyTitleMap(card.game),
      attrMap: (card.game === "gs" ? gsMeta : srMeta).attrMap,
      detail: {
        ...detail,
        markClass: result.grade,
        charWeight: result.weights,
        allAttr: summaryAttributes(pieces,card.game),
        artis: Object.fromEntries(
          pieces.map((piece) => [
            piece.idx,
            {
              ...piece,
              img: piece.image,
              mark: detail.artis[piece.idx].mark,
              markClass: grade(detail.artis[piece.idx]._mark),
              main: ArtisMark.formatArti(
                piece.main,
                config.attrs,
                true,
                card.game,
              ),
              attrs: ArtisMark.formatArtiAttrs(
                piece.attrs.map(stat => ({ ...stat, upNum: stat.rollCount || 0 })),
                config.attrs,
                card.game,
              ),
              pMax: ArtisMark.getPosMaxMark(
                config,
                piece.idx,
                ArtisMark.getMainKey(
                  piece.idx,
                  piece.main.key,
                  card.element,
                  card.game,
                  card.id,
                ),
                card.game,
              ),
            },
          ]),
        ),
      },
    };
  return result;
}

/** 用pieces副词条调用原版汇总；game决定最大档位与格式，沿用原版最多九格布局。 */
function summaryAttributes(pieces:Artifact[],game:"gs"|"sr"):any[] {
  const attrMap=(game==="gs" ? gsMeta : srMeta).attrMap;
  const all=Artis.prototype.getAllAttr.call({game,
    /** 将解码后的词条补齐原版有效档数，fn接收当前装备。 */
    forEach(fn:(piece:any)=>void):void {
      pieces.forEach(piece=>fn({...piece,attrs:piece.attrs.map(stat=>({...stat,upNum:stat.rollCount || 0,eff:stat.value/attrMap[stat.key].value}))}));
    }
  });
  const summary=Array.isArray(all) ? all.slice(0,9) : [];
  while (summary.length<9) summary.push({});
  return summary;
}
