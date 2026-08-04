import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const { parseFormattedScript, splitWords } = await import("../src/shared.js");

test("formatted script parser emits one highlight node per Chinese character", () => {
  const words = splitWords("欢迎使用Flow中文提词器。\n第二行开始");
  assert.deepEqual(words, [
    "欢", "迎", "使", "用", "Flow", "中", "文", "提", "词", "器。",
    "第", "二", "行", "开", "始"
  ]);
});

test("Chinese segmentation preserves formatting styles", () => {
  const words = parseFormattedScript("**中文AI**")
    .filter((token) => token.type === "word");

  assert.deepEqual(words.map((token) => token.text), ["中", "文", "AI"]);
  assert.ok(words.every((token) => token.style.bold));
});
