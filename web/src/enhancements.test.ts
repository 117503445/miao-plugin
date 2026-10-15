import { test } from "node:test";
import assert from "node:assert/strict";
import { enhancementCount, enhancementText } from "./enhancements";

/** 强化不包含词条首次生成，不能把三次赋值误报成强化三次。 */
test("初始与后续强化分开计数", () => {
  assert.equal(enhancementText({key:"atk",value:14,rollCount:3}), "强化2次");
  assert.equal(enhancementText({key:"cpct",value:3.9,rollCount:1}), "强化0次");
  assert.equal(enhancementText({key:"cdmg",value:40,rollCount:6}), "强化5次");
  assert.equal(enhancementCount({key:"atk",value:14,rollCount:3}), "2");
  assert.equal(enhancementCount({key:"cpct",value:3.9,rollCount:1}), "0");
});

/** 缺少历史记录时明确未知，不把未采集伪装成零次。 */
test("缺少次数不猜测", () => {
  assert.equal(enhancementText({key:"atk",value:14}), "强化次数未记录");
  assert.equal(enhancementCount({key:"atk",value:14}), "—");
});
