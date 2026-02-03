import { cleanHtml } from "./clean.js";
import { forEachToken } from "./tokenize.js";
import { collapseWhitespace } from "./utils.js";
import type {
  AnalyzeOptions,
  CleanDocument,
  DocumentIndex,
  HeadingInfo,
  HeadingNode,
  IndexOptions,
  LinkInfo,
  Stats,
} from "./types.js";

function getHeadingLevel(tag: string): number | null {
  if (tag.length !== 2 || tag[0] !== "h") {
    return null;
  }

  const level = Number(tag[1]);
  return Number.isInteger(level) && level >= 1 && level <= 6 ? level : null;
}

function buildHeadingTreeFromList(headings: HeadingInfo[]): HeadingNode[] {
  const roots: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  for (const heading of headings) {
    const node: HeadingNode = {
      level: heading.level,
      text: heading.text,
      nodeId: heading.nodeId,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return roots;
}

export function buildIndex(
  document: CleanDocument,
  options: IndexOptions = {}
): DocumentIndex {
  const caseSensitive = options.caseSensitive ?? false;
  const includeTitle = options.includeTitle ?? true;
  const includeMeta = options.includeMeta ?? true;
  const buildTagIndex = options.buildTagIndex ?? true;
  const storeText = options.storeText ?? true;
  const storeLowerText = options.storeLowerText ?? true;
  const collapseWhitespaceOutput = options.collapseWhitespace ?? true;

  const wordCounts = new Map<string, number>();
  const wordSet = new Set<string>();
  const headings: HeadingInfo[] = [];
  const links: LinkInfo[] = [];
  const tagIndex = buildTagIndex ? new Map<string, number[]>() : undefined;
  const textParts: string[] = [];

  let totalWords = 0;
  const headingCounts: Record<string, number> = {};

  const headingStack: Array<{ nodeId: number; level: number; parts: string[] }> = [];
  const linkStack: Array<{ nodeId: number; href?: string; rel?: string; parts: string[] }> = [];

  const tokenOptions = {
    caseSensitive,
    minLength: options.minWordLength ?? 1,
    includeNumbers: options.includeNumbers ?? true,
    allowApostrophe: options.allowApostrophe ?? true,
    allowHyphen: options.allowHyphen ?? true,
  };

  const addText = (text: string) => {
    if (!text) {
      return;
    }

    if (storeText) {
      textParts.push(text);
    }

    if (headingStack.length > 0) {
      headingStack[headingStack.length - 1].parts.push(text);
    }

    if (linkStack.length > 0) {
      linkStack[linkStack.length - 1].parts.push(text);
    }

    forEachToken(text, tokenOptions, (token) => {
      const current = wordCounts.get(token) ?? 0;
      wordCounts.set(token, current + 1);
      wordSet.add(token);
      totalWords += 1;
    });
  };

  if (includeTitle && document.meta.title) {
    addText(document.meta.title);
  }

  if (includeMeta) {
    if (document.meta.description) {
      addText(document.meta.description);
    }
    if (document.meta.keywords) {
      addText(document.meta.keywords);
    }
  }

  const stack: Array<{ nodeId: number; entering: boolean }> = [
    { nodeId: document.rootId, entering: true },
  ];

  while (stack.length > 0) {
    const frame = stack.pop() as { nodeId: number; entering: boolean };
    const node = document.nodes[frame.nodeId];

    if (frame.entering) {
      if (node.type === "root") {
        const children = node.children ?? [];
        for (let i = children.length - 1; i >= 0; i -= 1) {
          stack.push({ nodeId: children[i], entering: true });
        }
      } else if (node.type === "element") {
        const tag = node.tag ?? "";
        if (buildTagIndex && tag) {
          const list = tagIndex?.get(tag) ?? [];
          list.push(node.id);
          tagIndex?.set(tag, list);
        }

        const headingLevel = tag ? getHeadingLevel(tag) : null;
        if (headingLevel) {
          headingStack.push({ nodeId: node.id, level: headingLevel, parts: [] });
        }

        if (tag === "a") {
          linkStack.push({
            nodeId: node.id,
            href: node.attrs?.href,
            rel: node.attrs?.rel,
            parts: [],
          });
        }

        stack.push({ nodeId: node.id, entering: false });

        const children = node.children ?? [];
        for (let i = children.length - 1; i >= 0; i -= 1) {
          stack.push({ nodeId: children[i], entering: true });
        }
      } else if (node.type === "text") {
        addText(node.text ?? "");
      }
    } else if (node.type === "element") {
      const tag = node.tag ?? "";
      const headingLevel = tag ? getHeadingLevel(tag) : null;
      if (headingLevel) {
        const heading = headingStack.pop();
        if (heading) {
          const text = collapseWhitespace(heading.parts.join(" "));
          headings.push({ level: heading.level, text, nodeId: heading.nodeId });
          const key = `h${heading.level}`;
          headingCounts[key] = (headingCounts[key] ?? 0) + 1;
        }
      }

      if (tag === "a") {
        const link = linkStack.pop();
        if (link) {
          const text = collapseWhitespace(link.parts.join(" "));
          links.push({
            nodeId: link.nodeId,
            href: link.href,
            rel: link.rel,
            text,
          });
        }
      }
    }
  }

  const rawText = storeText ? textParts.join(" ") : "";
  const text = storeText && collapseWhitespaceOutput ? collapseWhitespace(rawText) : rawText;
  const textLower = storeLowerText ? text.toLowerCase() : undefined;

  const stats: Stats = {
    wordCount: totalWords,
    uniqueWords: wordSet.size,
    textLength: text.length,
    headingCounts,
    linkCount: links.length,
  };

  const index: DocumentIndex = {
    text,
    textLower,
    wordCounts,
    wordSet,
    totalWords,
    uniqueWords: wordSet.size,
  };

  document.headings = headings;
  document.headingTree = buildHeadingTreeFromList(headings);
  document.links = links;
  document.stats = stats;
  document.index = index;
  if (buildTagIndex) {
    document.tagIndex = tagIndex;
  }

  return index;
}

export function buildHeadingTree(document: CleanDocument): HeadingNode[] {
  const tree = buildHeadingTreeFromList(document.headings);
  document.headingTree = tree;
  return tree;
}

export function analyzeHtml(html: string, options: AnalyzeOptions = {}): CleanDocument {
  const document = cleanHtml(html, options);

  if (options.index !== false) {
    buildIndex(document, options.indexOptions);
  }

  return document;
}

export function getText(document: CleanDocument, includeMeta = true): string {
  if (document.index?.text) {
    return document.index.text;
  }

  const textParts: string[] = [];
  const stack: number[] = [document.rootId];
  while (stack.length > 0) {
    const nodeId = stack.pop() as number;
    const node = document.nodes[nodeId];
    if (node.type === "text" && node.text) {
      textParts.push(node.text);
      continue;
    }

    const children = node.children ?? [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }

  if (includeMeta) {
    if (document.meta.title) {
      textParts.push(document.meta.title);
    }
    if (document.meta.description) {
      textParts.push(document.meta.description);
    }
    if (document.meta.keywords) {
      textParts.push(document.meta.keywords);
    }
  }

  return collapseWhitespace(textParts.join(" "));
}
