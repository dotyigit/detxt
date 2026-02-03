export type NodeType = "root" | "element" | "text";

export interface CleanNode {
  id: number;
  type: NodeType;
  tag?: string;
  text?: string;
  attrs?: Record<string, string>;
  parent?: number;
  children?: number[];
}

export interface MetaInfo {
  title?: string;
  description?: string;
  keywords?: string;
  lang?: string;
  other: Record<string, string>;
}

export interface HeadingInfo {
  level: number;
  text: string;
  nodeId: number;
}

export interface HeadingNode {
  level: number;
  text: string;
  nodeId: number;
  children: HeadingNode[];
}

export interface LinkInfo {
  href?: string;
  rel?: string;
  text: string;
  nodeId: number;
}

export interface Stats {
  wordCount: number;
  uniqueWords: number;
  textLength: number;
  headingCounts: Record<string, number>;
  linkCount: number;
}

export interface CleanDocument {
  rootId: number;
  nodes: CleanNode[];
  meta: MetaInfo;
  headings: HeadingInfo[];
  headingTree?: HeadingNode[];
  links: LinkInfo[];
  stats: Stats;
  index?: DocumentIndex;
  tagIndex?: Map<string, number[]>;
}

export interface DocumentIndex {
  text: string;
  textLower?: string;
  wordCounts: Map<string, number>;
  wordSet: Set<string>;
  totalWords: number;
  uniqueWords: number;
}

export interface CleanOptions {
  removeTags?: string[];
  keepAttributes?: string[] | Record<string, string[]>;
  dropComments?: boolean;
  normalizeWhitespace?: boolean;
  includeHead?: boolean;
  includeMetaTags?: boolean;
  includeTitleTag?: boolean;
}

export interface IndexOptions {
  caseSensitive?: boolean;
  includeTitle?: boolean;
  includeMeta?: boolean;
  buildTagIndex?: boolean;
  minWordLength?: number;
  includeNumbers?: boolean;
  allowApostrophe?: boolean;
  allowHyphen?: boolean;
  storeText?: boolean;
  storeLowerText?: boolean;
  collapseWhitespace?: boolean;
}

export interface AnalyzeOptions extends CleanOptions {
  index?: boolean;
  indexOptions?: IndexOptions;
}

export interface TokenizeOptions {
  caseSensitive?: boolean;
  minLength?: number;
  includeNumbers?: boolean;
  allowApostrophe?: boolean;
  allowHyphen?: boolean;
}

export type KeywordStrategy = "auto" | "wordset" | "indexOf" | "aho-corasick";

export interface KeywordSearchOptions {
  caseSensitive?: boolean;
  matchWholeWords?: boolean;
  matchPhrases?: boolean;
  strategy?: KeywordStrategy;
  collectPositions?: boolean;
  allowApostrophe?: boolean;
  allowHyphen?: boolean;
}

export interface KeywordHit {
  keyword: string;
  count: number;
  density: number;
  positions?: number[];
}

export interface KeywordSearchResult {
  totalHits: number;
  uniqueHits: number;
  hits: Record<string, KeywordHit>;
  missing: string[];
  strategy: "wordset" | "indexOf" | "aho-corasick";
}

export interface WordStat {
  word: string;
  count: number;
  density: number;
}

export interface TopWordsOptions {
  limit?: number;
  minLength?: number;
  stopWords?: string[];
}
