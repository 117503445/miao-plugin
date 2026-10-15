import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRoute, routeHash } from "./route";

/** 验证外部分享链接优先于本地视图偏好，非法参数不会污染筛选。 */
test("解析分享路由与默认值", () => {
  assert.equal(parseRoute("", "cards").view, "cards");
  assert.deepEqual(parseRoute("#/sr/list?sort=weak&element=ice&incomplete=1&q=银狼"), {
    game: "sr", view: "list", query: "银狼", element: "ice", sort: "weak", incomplete: true, character: "", panel: "",
  });
  const route = parseRoute("#/wrong/view?sort=bad&element=cryo&panel=bad&character=sr-1001");
  assert.equal(route.game, "gs");
  assert.equal(route.view, "list");
  assert.equal(route.sort, "level");
  assert.equal(route.character, "");
  assert.equal(route.panel, "");
  assert.equal(parseRoute("#/sr/list?element=cryo").element, "");
});

/** 验证角色、弹窗及包含特殊字符的搜索词可以无损写入并恢复。 */
test("路由往返与角色详情", () => {
  const state = { game: "gs", view: "list", query: "桑多涅 & 攻击+", element: "cryo", sort: "score", incomplete: false, character: "gs-Sandrone", panel: "score" } as const;
  assert.deepEqual(parseRoute(routeHash(state)), state);
  assert.equal(parseRoute("#/gs/list?panel=profile").panel, "");
  assert.equal(routeHash(parseRoute("#/gs/list")), "#/gs/list");
  assert.doesNotThrow(() => parseRoute("#/%XX/list?q=%"));
});
