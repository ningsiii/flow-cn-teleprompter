import test from "node:test";
import assert from "node:assert/strict";

import {
  findApproximateTokenMatch,
  passesVoiceConfidence,
  splitDisplayUnits,
  splitTrackingTokens
} from "../src/tracking-text.js";

test("accepts Vosk partial text when confidence is unavailable", () => {
  assert.equal(passesVoiceConfidence(null, 0.35), true);
  assert.equal(passesVoiceConfidence(undefined, 0.35), true);
  assert.equal(passesVoiceConfidence(0.2, 0.35), false);
  assert.equal(passesVoiceConfidence(0.7, 0.35), true);
});

test("splits unspaced Chinese into highlightable display units", () => {
  assert.deepEqual(splitDisplayUnits("今天我们开始。"), ["今", "天", "我", "们", "开", "始。"]);
});

test("keeps English words and numbers intact in mixed scripts", () => {
  assert.deepEqual(splitDisplayUnits("用Windows11录AI视频"), ["用", "Windows11", "录", "AI", "视", "频"]);
});

test("attaches leading and trailing punctuation to nearby Han characters", () => {
  assert.deepEqual(splitDisplayUnits("“你好！”"), ["“你", "好！”"]);
});

test("normalizes Vosk word spacing to the same Han token granularity", () => {
  assert.deepEqual(splitTrackingTokens("今天 我们 开始"), ["今", "天", "我", "们", "开", "始"]);
  assert.deepEqual(splitTrackingTokens("今 天 Windows 11"), ["今", "天", "Windows", "1", "1"]);
});

test("treats common spoken Chinese digits and Arabic digits as equivalent", () => {
  assert.deepEqual(splitTrackingTokens("一二三"), ["1", "2", "3"]);
  assert.deepEqual(splitTrackingTokens("123"), ["1", "2", "3"]);
  assert.deepEqual(splitTrackingTokens("壹两叁"), ["1", "2", "3"]);
  assert.deepEqual(splitTrackingTokens("Windows11"), ["Windows11"]);
});

test("matches an Arabic quantity with spoken Chinese number units", () => {
  const script = splitTrackingTokens("编号132继续讲解");
  const spoken = splitTrackingTokens("编号一百三十二继续讲解");
  const match = findApproximateTokenMatch(script, spoken, {
    minSpokenTokens: 2,
    maxSpokenTokens: 20,
    maxErrorRate: 0.34
  });

  assert.ok(match);
  assert.equal(script[match.endIndex], "解");
});

test("relocks on following Chinese text after a digit mismatch", () => {
  const script = splitTrackingTokens("编号1234下面继续介绍核心内容");
  const spoken = splitTrackingTokens("编号一二四下面继续介绍核心内容");
  const match = findApproximateTokenMatch(script, spoken, {
    minSpokenTokens: 4,
    maxSpokenTokens: 12,
    expectedIndex: 4,
    searchStart: 0,
    searchEnd: script.length - 1
  });

  assert.ok(match);
  assert.equal(script[match.endIndex], "容");
});

test("finds a nearby Chinese phrase despite a substitution", () => {
  const script = splitTrackingTokens("今天我们讨论人工智能的发展方向");
  const spoken = splitTrackingTokens("讨论人工只能的发展");
  const match = findApproximateTokenMatch(script, spoken, {
    searchStart: 0,
    searchEnd: script.length - 1,
    expectedIndex: 4
  });

  assert.ok(match);
  assert.equal(script[match.endIndex], "展");
  assert.equal(match.distance, 1);
});

test("uses expected position to disambiguate repeated phrases", () => {
  const script = splitTrackingTokens("我们开始第一段然后停顿我们开始第二段");
  const spoken = splitTrackingTokens("我们开始");
  const match = findApproximateTokenMatch(script, spoken, {
    searchStart: 0,
    searchEnd: script.length - 1,
    expectedIndex: script.length - 5
  });

  assert.ok(match);
  assert.ok(match.endIndex > script.length / 2);
});

test("rejects unrelated speech instead of moving the prompt", () => {
  const script = splitTrackingTokens("今天我们讨论人工智能的发展方向");
  const spoken = splitTrackingTokens("明天下午出去吃饭散步");
  assert.equal(findApproximateTokenMatch(script, spoken), null);
});

test("tracks through occasional English terms using nearby Chinese anchors", () => {
  const script = splitTrackingTokens("今天讲 AI prompt 和 coding 技巧");
  const spoken = splitTrackingTokens("今天讲和技巧");
  const match = findApproximateTokenMatch(script, spoken, {
    searchStart: 0,
    searchEnd: script.length - 1,
    expectedIndex: 0
  });

  assert.ok(match);
  assert.equal(script[match.endIndex], "巧");
  assert.ok(match.errorRate < 0.1);
});
