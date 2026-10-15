/** 单条已解码装备属性。 */
export interface Stat {
  key: string;
  value: number;
  /** 含词条首次生成的赋值次数，未采集时缺省。 */
  rollCount?: number;
}
/** 圣遗物或遗器的原始装备数据。 */
export interface Artifact {
  idx: number;
  name: string;
  set: string;
  level: number;
  star: number;
  main: Stat;
  attrs: Stat[];
  image: string;
}
/** 当前装备武器或光锥。 */
export interface Weapon {
  name: string;
  level: number;
  affix: number;
  star: number;
  image: string;
  bonus: Stat;
}
/** 账号中一个角色的配装快照。 */
export interface Card {
  key: string;
  id: number;
  name: string;
  ruleName: string;
  game: "gs" | "sr";
  element: string;
  path: string;
  level: number;
  cons: number;
  star: number;
  image: string;
  banner: string;
  baseAttr: Record<string, number>;
  attr: Record<string, number>;
  weapon: Weapon | null;
  talents: { name: string; level: number }[];
  artifacts: Artifact[];
  notes: string[];
}
/** 游戏账号公开快照。 */
export interface Account {
  game: "gs" | "sr";
  uid: string;
  snapshotAt: string;
  source: string;
  characters: Card[];
}
/** 站点静态数据，包含独立的数据日期及评分源码版本。 */
export interface Snapshot {
  schema: number;
  generatedAt: string;
  upstreamCommit: string;
  accounts: Account[];
}
/** 从上游算法得到的评分结果。 */
export interface ScoredCard extends Card {
  score: number;
  grade: string;
  complete: boolean;
  rule: string;
  weights: Record<string, number>;
  artifacts: (Artifact & { score: number; grade: string })[];
  native?: Record<string, any>;
}
