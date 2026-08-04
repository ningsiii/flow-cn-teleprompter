/*
 * Chinese and mixed-language text helpers for Flow-CN.
 * Kept independent from the DOM so the tracking contract can be tested.
 */

const HAN_CHARACTER_PATTERN = /^\p{Script=Han}$/u;
const LETTER_OR_NUMBER_PATTERN = /^[\p{L}\p{N}]$/u;
const LATIN_TOKEN_PATTERN = /[A-Za-z]/u;
const OPTIONAL_LATIN_COST = 0.2;
const CHINESE_NUMBER_UNIT_PATTERN = /^[十拾百佰千仟万萬亿億兆]$/u;
const OPTIONAL_NUMBER_UNIT_COST = 0.15;
const CHINESE_DIGIT_EQUIVALENTS = new Map([
  ["零", "0"], ["〇", "0"],
  ["一", "1"], ["壹", "1"], ["幺", "1"],
  ["二", "2"], ["两", "2"], ["兩", "2"], ["贰", "2"], ["貳", "2"],
  ["三", "3"], ["叁", "3"], ["參", "3"],
  ["四", "4"], ["肆", "4"],
  ["五", "5"], ["伍", "5"],
  ["六", "6"], ["陆", "6"], ["陸", "6"],
  ["七", "7"], ["柒", "7"],
  ["八", "8"], ["捌", "8"],
  ["九", "9"], ["玖", "9"]
]);

export function isHanCharacter(character) {
  return HAN_CHARACTER_PATTERN.test(character);
}

export function passesVoiceConfidence(confidence, threshold) {
  if (confidence === null || confidence === undefined || confidence === "") {
    return true;
  }

  const numericConfidence = Number(confidence);
  return !Number.isFinite(numericConfidence) || numericConfidence >= Number(threshold);
}

export function splitDisplayUnits(text) {
  const units = [];
  let current = "";
  let currentKind = "empty";

  const commit = () => {
    if (current) {
      units.push(current);
    }
    current = "";
    currentKind = "empty";
  };

  for (const character of String(text || "")) {
    if (isHanCharacter(character)) {
      if (currentKind === "han" || currentKind === "word") {
        commit();
      }

      current += character;
      currentKind = "han";
      continue;
    }

    if (LETTER_OR_NUMBER_PATTERN.test(character)) {
      if (currentKind === "han" || currentKind === "punctuation") {
        commit();
      }

      current += character;
      currentKind = "word";
      continue;
    }

    current += character;
    if (currentKind === "empty") {
      currentKind = "punctuation";
    }
  }

  commit();
  return units;
}

export function splitTrackingTokens(text) {
  const tokens = [];
  let current = "";

  const commit = () => {
    if (current) {
      // Vosk can emit spoken Chinese digits as Han characters while a script
      // commonly contains Arabic digits. Keep Latin terms such as Windows11
      // intact, but split a digits-only run so 123 and 一二三 share tokens.
      if (/^\d+$/u.test(current)) {
        tokens.push(...current);
      } else {
        tokens.push(current);
      }
      current = "";
    }
  };

  for (const character of String(text || "")) {
    if (/\s/u.test(character)) {
      commit();
      continue;
    }

    if (isHanCharacter(character)) {
      commit();
      tokens.push(CHINESE_DIGIT_EQUIVALENTS.get(character) || character);
      continue;
    }

    current += character;
  }

  commit();
  return tokens;
}

function tokenEditDistance(left, right) {
  const optionalTokenCost = (token) => {
    if (LATIN_TOKEN_PATTERN.test(token)) {
      return OPTIONAL_LATIN_COST;
    }
    if (CHINESE_NUMBER_UNIT_PATTERN.test(token)) {
      return OPTIONAL_NUMBER_UNIT_COST;
    }
    return 1;
  };

  let previous = [0];
  for (const token of right) {
    previous.push(previous.at(-1) + optionalTokenCost(token));
  }

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const spokenTokenCost = optionalTokenCost(left[leftIndex]);
    const current = [previous[0] + spokenTokenCost];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const scriptTokenCost = optionalTokenCost(right[rightIndex]);
      const substitutionCost = left[leftIndex] === right[rightIndex]
        ? 0
        : Math.min(spokenTokenCost, scriptTokenCost);
      current.push(Math.min(
        current[rightIndex] + scriptTokenCost,
        previous[rightIndex + 1] + spokenTokenCost,
        previous[rightIndex] + substitutionCost
      ));
    }
    previous = current;
  }

  return previous[right.length];
}

export function findApproximateTokenMatch(scriptTokens, spokenTokens, options = {}) {
  const minSpokenTokens = Math.max(Number(options.minSpokenTokens) || 4, 2);
  const maxSpokenTokens = Math.max(Number(options.maxSpokenTokens) || 12, minSpokenTokens);
  const recentSpoken = spokenTokens.slice(-maxSpokenTokens);
  if (scriptTokens.length === 0 || recentSpoken.length < minSpokenTokens) {
    return null;
  }

  const maxScriptIndex = scriptTokens.length - 1;
  const searchStart = Math.max(Math.min(Number(options.searchStart) || 0, maxScriptIndex), 0);
  const searchEnd = Math.max(Math.min(
    Number.isFinite(Number(options.searchEnd)) ? Number(options.searchEnd) : maxScriptIndex,
    maxScriptIndex
  ), searchStart);
  const expectedIndex = Math.max(Math.min(
    Number.isFinite(Number(options.expectedIndex)) ? Number(options.expectedIndex) : searchStart,
    searchEnd
  ), searchStart);
  const maxErrorRate = Math.max(Math.min(Number(options.maxErrorRate) || 0.34, 0.75), 0);
  let best = null;

  for (let candidateLength = Math.max(recentSpoken.length - 2, minSpokenTokens);
    candidateLength <= recentSpoken.length + 4;
    candidateLength += 1) {
    for (let startIndex = searchStart; startIndex + candidateLength - 1 <= searchEnd; startIndex += 1) {
      const candidate = scriptTokens.slice(startIndex, startIndex + candidateLength);
      const distance = tokenEditDistance(recentSpoken, candidate);
      const errorRate = distance / Math.max(recentSpoken.length, candidate.length);
      const endIndex = startIndex + candidateLength - 1;
      const proximityPenalty = (Math.abs(endIndex - expectedIndex) / Math.max(searchEnd - searchStart + 1, 1)) * 0.08;
      const score = errorRate + proximityPenalty;

      if (!best || score < best.score || (score === best.score && endIndex > best.endIndex)) {
        best = {
          startIndex,
          endIndex,
          spokenLength: recentSpoken.length,
          candidateLength,
          distance,
          errorRate,
          score
        };
      }
    }
  }

  return best && best.errorRate <= maxErrorRate ? best : null;
}
