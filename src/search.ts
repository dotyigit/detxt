import { buildIndex } from "./indexer.js";
import { searchAho } from "./aho.js";
import { isWordBoundary, normalizeCase } from "./utils.js";
import { isLikelySingleWord } from "./tokenize.js";
import type {
  CleanDocument,
  DocumentIndex,
  KeywordHit,
  KeywordSearchOptions,
  KeywordSearchResult,
  KeywordStrategy,
} from "./types.js";

function getIndex(input: CleanDocument | DocumentIndex): DocumentIndex {
  if ((input as DocumentIndex).text !== undefined) {
    return input as DocumentIndex;
  }

  const document = input as CleanDocument;
  return buildIndex(document);
}

function countOccurrences(
  text: string,
  pattern: string,
  options: {
    matchWholeWords: boolean;
    collectPositions: boolean;
    allowApostrophe?: boolean;
    allowHyphen?: boolean;
  }
): { count: number; positions?: number[] } {
  let count = 0;
  const positions: number[] | undefined = options.collectPositions ? [] : undefined;
  if (!pattern) {
    return { count, positions };
  }

  let index = 0;
  while (index <= text.length - pattern.length) {
    const found = text.indexOf(pattern, index);
    if (found === -1) {
      break;
    }

    const end = found + pattern.length;
    if (
      !options.matchWholeWords ||
      isWordBoundary(text, found, end, {
        allowApostrophe: options.allowApostrophe,
        allowHyphen: options.allowHyphen,
      })
    ) {
      count += 1;
      if (positions) {
        positions.push(found);
      }
    }

    index = end > found ? end : found + 1;
  }

  return { count, positions };
}

export function searchKeywords(
  input: CleanDocument | DocumentIndex,
  keywords: string[],
  options: KeywordSearchOptions = {}
): KeywordSearchResult {
  const index = getIndex(input);
  const caseSensitive = options.caseSensitive ?? false;
  const matchWholeWords = options.matchWholeWords ?? true;
  const matchPhrases = options.matchPhrases ?? true;
  const allowApostrophe = options.allowApostrophe ?? true;
  const allowHyphen = options.allowHyphen ?? true;

  const cleanedKeywords = keywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  const normalizedKeywords = cleanedKeywords.map((keyword) =>
    normalizeCase(keyword, caseSensitive)
  );

  const text = caseSensitive ? index.text : index.textLower ?? index.text.toLowerCase();

  const resultHits: Record<string, KeywordHit> = {};
  const missing: string[] = [];
  let totalHits = 0;
  let uniqueHits = 0;

  if (!matchPhrases && !caseSensitive) {
    for (let i = 0; i < cleanedKeywords.length; i += 1) {
      const original = cleanedKeywords[i];
      const normalized = normalizedKeywords[i];
      const tokens = normalized.split(/\s+/g).filter(Boolean);
      const counts = tokens.map((token) => index.wordCounts.get(token) ?? 0);
      const count = counts.length > 0 ? Math.min(...counts) : 0;
      const density = index.totalWords > 0 ? count / index.totalWords : 0;
      if (count === 0) {
        missing.push(original);
      } else {
        uniqueHits += 1;
      }
      totalHits += count;
      resultHits[original] = { keyword: original, count, density };
    }

    return {
      totalHits,
      uniqueHits,
      hits: resultHits,
      missing,
      strategy: "wordset",
    };
  }

  const strategy: KeywordStrategy = options.strategy ?? "auto";
  const allSingleWord = normalizedKeywords.every((keyword) =>
    isLikelySingleWord(keyword, { allowApostrophe, allowHyphen })
  );

  let actualStrategy: "wordset" | "indexOf" | "aho-corasick" = "indexOf";

  if (strategy === "wordset") {
    actualStrategy = "wordset";
  } else if (strategy === "aho-corasick") {
    actualStrategy = "aho-corasick";
  } else if (strategy === "indexOf") {
    actualStrategy = "indexOf";
  } else if (matchWholeWords && !caseSensitive && allSingleWord) {
    actualStrategy = "wordset";
  } else {
    const totalLength = normalizedKeywords.reduce((sum, keyword) => sum + keyword.length, 0);
    actualStrategy = cleanedKeywords.length >= 8 || totalLength >= 64 ? "aho-corasick" : "indexOf";
  }

  if (actualStrategy === "wordset" && (!matchWholeWords || caseSensitive || !allSingleWord)) {
    actualStrategy = "indexOf";
  }

  if (actualStrategy === "wordset") {
    for (let i = 0; i < cleanedKeywords.length; i += 1) {
      const original = cleanedKeywords[i];
      const normalized = normalizedKeywords[i];
      const count = index.wordCounts.get(normalized) ?? 0;
      const density = index.totalWords > 0 ? count / index.totalWords : 0;
      if (count === 0) {
        missing.push(original);
      } else {
        uniqueHits += 1;
      }
      totalHits += count;
      resultHits[original] = { keyword: original, count, density };
    }

    return {
      totalHits,
      uniqueHits,
      hits: resultHits,
      missing,
      strategy: "wordset",
    };
  }

  if (actualStrategy === "aho-corasick") {
    const { counts, positions } = searchAho(text, normalizedKeywords, {
      collectPositions: options.collectPositions ?? false,
      matchWholeWords,
      allowApostrophe,
      allowHyphen,
    });

    for (let i = 0; i < cleanedKeywords.length; i += 1) {
      const original = cleanedKeywords[i];
      const count = counts[i] ?? 0;
      const density = index.totalWords > 0 ? count / index.totalWords : 0;
      if (count === 0) {
        missing.push(original);
      } else {
        uniqueHits += 1;
      }
      totalHits += count;
      resultHits[original] = {
        keyword: original,
        count,
        density,
        positions: positions ? positions[i] : undefined,
      };
    }

    return {
      totalHits,
      uniqueHits,
      hits: resultHits,
      missing,
      strategy: "aho-corasick",
    };
  }

  for (let i = 0; i < cleanedKeywords.length; i += 1) {
    const original = cleanedKeywords[i];
    const normalized = normalizedKeywords[i];
    const { count, positions } = countOccurrences(text, normalized, {
      matchWholeWords,
      collectPositions: options.collectPositions ?? false,
      allowApostrophe,
      allowHyphen,
    });
    const density = index.totalWords > 0 ? count / index.totalWords : 0;
    if (count === 0) {
      missing.push(original);
    } else {
      uniqueHits += 1;
    }
    totalHits += count;
    resultHits[original] = {
      keyword: original,
      count,
      density,
      positions,
    };
  }

  return {
    totalHits,
    uniqueHits,
    hits: resultHits,
    missing,
    strategy: "indexOf",
  };
}

export function containsKeyword(
  input: CleanDocument | DocumentIndex,
  keyword: string,
  options: KeywordSearchOptions = {}
): boolean {
  const cleaned = keyword.trim();
  if (!cleaned) {
    return false;
  }
  const result = searchKeywords(input, [cleaned], options);
  return (result.hits[cleaned]?.count ?? 0) > 0;
}
