import type { DocumentIndex, TopWordsOptions, WordStat } from "./types.js";

export function getTopWords(
  index: DocumentIndex,
  options: TopWordsOptions = {}
): WordStat[] {
  const limit = options.limit ?? 20;
  const minLength = options.minLength ?? 1;
  const stopWords = new Set(options.stopWords ?? []);

  const stats: WordStat[] = [];
  for (const [word, count] of index.wordCounts) {
    if (word.length < minLength) {
      continue;
    }
    if (stopWords.has(word)) {
      continue;
    }
    const density = index.totalWords > 0 ? count / index.totalWords : 0;
    stats.push({ word, count, density });
  }

  stats.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.word.localeCompare(b.word);
  });

  return stats.slice(0, Math.max(0, limit));
}
