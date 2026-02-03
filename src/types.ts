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
  canonicalUrl?: string;
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

export interface HeadingSection {
  level: number;
  text: string;
  nodeId: number;
  content: string;
  children: HeadingSection[];
}

export interface HeadingSectionOptions {
  includeHeadingText?: boolean;
}

export interface SeoOptions {
  baseUrl?: string;
  ignoreProtocols?: string[];
}

export interface SeoSummary {
  titleLength: number;
  descriptionLength: number;
  wordCount: number;
  uniqueWords: number;
  h1Count: number;
  headingCounts: Record<string, number>;
  linkCount: number;
  internalLinks: number;
  externalLinks: number;
  nofollowLinks: number;
  ignoredLinks: number;
  linksMissingHref: number;
  imageCount: number;
  imagesMissingAlt: number;
  canonicalUrl?: string;
}

export type UrlClassification = "internal" | "external" | "inline" | "ignored" | "missing";

export interface JsonLdEntry {
  raw?: string;
  value?: unknown;
  error?: string;
}

export interface MicrodataValue {
  type: "text" | "item";
  value?: string;
  itemId?: number;
}

export interface MicrodataItem {
  id: number;
  types: string[];
  itemid?: string;
  properties: Record<string, MicrodataValue[]>;
}

export interface SchemaInfo {
  jsonLd: JsonLdEntry[];
  microdata: MicrodataItem[];
}

export interface ImageInfo {
  nodeId: number;
  src?: string;
  alt?: string;
  title?: string;
  loading?: string;
  width?: string;
  height?: string;
  srcset?: string;
  dataSrc?: string;
  dataSrcset?: string;
  effectiveSrc?: string;
  hasAlt: boolean;
  isLazy: boolean;
  isLinked: boolean;
  linkHref?: string;
  linkRel?: string;
  urlType?: UrlClassification;
  path?: string;
}

export interface ImageSummary {
  total: number;
  uniqueSrc: number;
  missingSrc: number;
  missingAlt: number;
  linkedImages: number;
  lazyImages: number;
  withSrcset: number;
  inlineImages: number;
  internalImages: number;
  externalImages: number;
  ignoredImages: number;
}

export interface ImageAnalysisOptions {
  baseUrl?: string;
  ignoreProtocols?: string[];
  includePath?: boolean;
  pathMaxDepth?: number;
}

export interface ImageAnalysisResult {
  summary: ImageSummary;
  images: ImageInfo[];
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
  headingSections?: HeadingSection[];
  schema?: SchemaInfo;
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
  extractJsonLd?: boolean;
  includeJsonLdRaw?: boolean;
  parseJsonLd?: boolean;
  extractMicrodata?: boolean;
}

export interface IndexOptions {
  caseSensitive?: boolean;
  includeTitle?: boolean;
  includeMeta?: boolean;
  buildTagIndex?: boolean;
  buildHeadingSections?: boolean;
  headingSectionOptions?: HeadingSectionOptions;
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
