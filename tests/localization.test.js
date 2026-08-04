import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.window = {};

const {
  LANGUAGE_OPTIONS,
  detectPreferredAppLanguage,
  translate
} = await import("../src/shared.js");

test("uses Chinese for a Chinese Windows or WebView locale", () => {
  assert.equal(detectPreferredAppLanguage(["zh-CN", "en-US"]), "zh");
  assert.equal(detectPreferredAppLanguage(["zh-Hans"]), "zh");
  assert.equal(detectPreferredAppLanguage(["en-US"]), "en");
});

test("exposes Simplified Chinese as an app language", () => {
  assert.ok(LANGUAGE_OPTIONS.some((option) => option.value === "zh"));
  assert.equal(translate("common.addScript", "zh"), "添加稿件");
  assert.equal(translate("input.saveText", "zh"), "保存并用于提词器");
});

test("main window has a visible script entry and settings has a Chinese option", async () => {
  const [mainHtml, settingsHtml] = await Promise.all([
    readFile(new URL("../src/index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/settings.html", import.meta.url), "utf8")
  ]);

  assert.match(mainHtml, /id="inputButton"[^>]*>[\s\S]*common\.addScript/);
  assert.match(mainHtml, /id="voiceDiagnostics"/);
  assert.match(mainHtml, /assets\/vendor\/vosk\.js/);
  assert.match(settingsHtml, /option value="zh"/);
  assert.match(settingsHtml, /data-value="zh"/);
});

test("voice mode supports click-to-reanchor without restarting the microphone", async () => {
  const mainScript = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

  assert.match(mainScript, /activeMode !== "voice"/);
  assert.match(mainScript, /reanchorVoiceTrackingAtIndex\(wordIndex\)/);
  assert.match(mainScript, /voiceRecognition\?\.reset\?\.\(\)/);
  assert.match(mainScript, /recognizer = createRecognizer\(\)/);
});
