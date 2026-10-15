/** 构建阶段使用art-template执行未修改的喵喵模板，产出独立静态HTML。 */
import template from "art-template";
import { createServer } from "vite";
import { readFile, mkdir, writeFile, access, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { Snapshot, Card } from "../src/types";
import { copyVersionedAssets } from "./static-assets";

const web = resolve(fileURLToPath(new URL("..", import.meta.url)));
const root = resolve(web, ".."),
  resources = join(root, "resources"),
  output = join(web, "public");
const weapons = new Map<string, any>();
for (const game of ["gs", "sr"]) {
  const dir = join(resources, `meta-${game}/weapon`);
  for (const file of await readdir(dir, { recursive: true }))
    if (file.endsWith("/data.json")) {
      const data = JSON.parse(await readFile(join(dir, file), "utf8"));
      weapons.set(`${game}/${data.name}`, data);
    }
}
/** 检查path是否有真实素材，缺图仅留透明占位，不伪造角色数据。 */
async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
/** 将path的素材复制到静态目录，返回URL；缺图返回透明占位URL。 */
async function media(path: string): Promise<string> {
  if (!(await exists(path))) return "/native-media/empty.svg";
  const raw = await readFile(path);
  const name =
    createHash("sha256").update(raw).digest("hex").slice(0, 16) + ".webp";
  await writeFile(join(output, "native-media", name), raw);
  return "/native-media/" + name;
}
/** 将card已导出的天赋与命座信息适配到上游模板需要的字段。 */
async function characterData(card: Card): Promise<Record<string, any>> {
  const dir = join(resources, `meta-${card.game}`, "character", card.ruleName);
  const meta = (await exists(join(dir, "data.json")))
    ? JSON.parse(await readFile(join(dir, "data.json"), "utf8"))
    : {};
  const imgs: Record<string, string> = { splash: card.banner || card.image };
  const talent: Record<string, any> = {};
  const keys = card.game === "gs" ? ["a", "e", "q"] : ["a", "e", "q", "t"];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i],
      t = card.talents[i],
      original = t?.level || 0;
    const extra =
      meta.talentCons?.[key] > 0 && card.cons >= meta.talentCons[key]
        ? card.game === "gs"
          ? 3
          : key === "a"
            ? 1
            : 2
        : 0;
    talent[key] = { level: original + extra, original };
    const source =
      card.game === "gs"
        ? key === "a"
          ? join(resources, "common/item", `atk-${meta.weapon}.webp`)
          : join(
              dir,
              "icons",
              meta.talentCons?.[key] > 0
                ? `cons-${meta.talentCons[key]}.webp`
                : `talent-${key}.webp`,
            )
        : join(dir, "imgs", `talent-${key}.webp`);
    imgs[key] = await media(source);
  }
  for (let i = 1; i <= 6; i++) {
    const source =
      card.game === "gs"
        ? join(dir, "icons", `cons-${i}.webp`)
        : i === 3 || i === 5
          ? join(dir, "imgs", `talent-${meta.talentCons?.[i] || "a"}.webp`)
          : join(dir, "imgs", `cons-${i}.webp`);
    imgs[`cons${i}`] = await media(source);
  }
  const weapon = {
    name: card.weapon?.name || "未导出装备",
    level: card.weapon?.level || "—",
    affix: card.weapon?.affix || "—",
    star: card.weapon?.star || 0,
    img: card.weapon?.image || "/native-media/empty.svg",
    splash: card.weapon?.image || "/native-media/empty.svg",
    attrs: { atkBase: "—", hp: "—", atk: "—", def: "—" },
    desc: { desc: "" },
  };
  const metaWeapon = weapons.get(`${card.game}/${card.weapon?.name}`);
  if (metaWeapon && card.weapon) {
    if (card.game === "gs") {
      weapon.attrs = {
        atkBase:
          card.weapon.level === 90
            ? Math.round(metaWeapon.attr.atk["90"]).toString()
            : "—",
      } as any;
      const key = metaWeapon.attr.bonusKey,
        value = metaWeapon.attr.bonusData?.[card.weapon.level];
      if (key && value !== undefined)
        (weapon.attrs as any)[key] = value + (key === "mastery" ? "" : "%");
    } else if (card.weapon.level === 80)
      weapon.attrs = Object.fromEntries(
        Object.entries(metaWeapon.baseAttr).map(([key, value]) => [
          key,
          Math.round(Number(value)).toString(),
        ]),
      ) as any;
    const affix = metaWeapon.affixData;
    if (affix?.text)
      weapon.desc.desc = affix.text.replace(
        /\$\[(\d+)\]/g,
        (_: string, key: string) =>
          affix.datas?.[key]?.[card.weapon!.affix - 1] ?? "—",
      );
  }
  return {
    name: card.name,
    abbr: card.name,
    elem: card.element,
    level: card.level,
    cons: card.cons,
    weapon,
    talent,
    treeData: [],
    imgs,
    dataSource: "离线配装；未采集战斗属性",
    updateTime: card.game === "gs" ? "2026-10-15" : "2026-10-07",
  };
}

await Promise.all(
  ["profiles", "scores", "native-media"].map((dir) =>
    mkdir(join(output, dir), { recursive: true }),
  ),
);
await writeFile(
  join(output, "native-media/empty.svg"),
  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
);
const resourcePrefix = await copyVersionedAssets(resources, output);
const server = await createServer({
  root: web,
  configFile: false,
  resolve: {
    dedupe: ["lodash"],
    alias: [
      {
        find: "#miao.models",
        replacement: join(web, "src/upstream-models.ts"),
      },
      { find: "#miao", replacement: join(web, "src/upstream-bridge.ts") },
    ],
  },
  ssr: { external: ["lodash"] },
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: "custom",
  logLevel: "error",
});
try {
  const { scoreCard } = await server.ssrLoadModule("/src/scoring.ts");
  const snapshot: Snapshot = JSON.parse(
    await readFile(join(output, "accounts.json"), "utf8"),
  );
  const manifest: Record<string, any> = {
    renderer: "art-template",
    resourcePrefix,
    templates: {},
    characters: [],
  };
  for (const file of [
    "character/profile-detail.html",
    "character/artis-mark.html",
    "character/profile-detail.css",
    "character/artis-mark.css",
    "common/layout/elem.html",
    "common/common.css",
  ])
    manifest.templates[file] = createHash("sha256")
      .update(await readFile(join(resources, file)))
      .digest("hex");
  for (const account of snapshot.accounts)
    for (const card of account.characters) {
      const scored = scoreCard(card, true),
        native = scored.native,
        data = await characterData(card);
      const context = {
        elemLayout: join(resources, "common/layout/elem.html"),
        _res_path: "",
        _miao_path: "/",
        _imgUrl: (url: string) => url,
        sys: { scale: "", copyright: "" },
        copyright: "",
        game: card.game,
        elem: card.element,
        element: card.element,
        mode: "profile",
        displayMode: "profile",
        data,
        imgs: data.imgs,
        splash: data.imgs.splash,
        uid: account.uid,
        attr: {},
        artisDetail: native.detail,
        artisKeyTitle: native.titles,
        charCfg: native.config,
        attrMap: native.attrMap,
        dmgCalc: { dmgData: [] },
        hsr_paths: card.path,
      };
      for (const [directory, file] of [
        ["profiles", "profile-detail.html"],
        ["scores", "artis-mark.html"],
      ]) {
        let html = template.render(
          await readFile(join(resources, "character", file), "utf8"),
          context,
          {
            filename: join(resources, "character", file),
            cache: true,
            debug: false,
            compileDebug: false,
            escape: true,
          },
        );
        // 上游为截图固定600/660像素；缩放由外层网页完成，仅取消机器人截图的body放大。
        // 离线快照未导出完整战斗属性，隐藏空面板，不用猜测值填充原版表格。
        html = html.replace(
          "</head>",
          "<style>body{transform:none;margin:0}.char-attr,.copyright{display:none}</style></head>",
        );
        // 仅替换资源URL，原版模板和CSS内容保持不变；资源变化时URL自动更新。
        html = html.replace(
          /(["'(])\/(common|character|meta-sr\/public)\//g,
          `$1${resourcePrefix}/$2/`,
        );
        await writeFile(join(output, directory, card.key + ".html"), html);
      }
      manifest.characters.push({
        key: card.key,
        game: card.game,
        score: scored.score,
        grade: scored.grade,
        pieces: card.artifacts.length,
      });
    }
  await writeFile(
    join(output, "renderer-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(
    `喵喵原版模板已静态渲染 ${manifest.characters.length} 位角色，共 ${manifest.characters.length * 2} 张面板`,
  );
} finally {
  await server.close();
}
