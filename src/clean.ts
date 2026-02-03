import { parseDocument } from "htmlparser2";
import type { AnyNode, Element, Text } from "domhandler";
import { collapseWhitespace, isEmptyText } from "./utils.js";
import { extractSchemasFromDom } from "./schema.js";
import type { CleanDocument, CleanNode, CleanOptions, MetaInfo } from "./types.js";

const DEFAULT_REMOVE_TAGS = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "canvas",
  "iframe",
  "object",
  "embed",
];

const DEFAULT_KEEP_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "rel"],
  img: ["alt", "src", "srcset", "data-src", "data-srcset", "loading", "width", "height", "title"],
  link: ["href", "rel"],
};

function collectDomText(node: AnyNode, normalizeWhitespace: boolean): string {
  const parts: string[] = [];
  const stack: AnyNode[] = [node];

  while (stack.length > 0) {
    const current = stack.pop() as AnyNode;
    if (current.type === "text") {
      const textNode = current as Text;
      parts.push(textNode.data);
      continue;
    }

    const children = (current as Element).children ?? [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }

  const raw = parts.join(" ");
  if (!normalizeWhitespace) {
    return raw.trim();
  }
  return collapseWhitespace(raw);
}

function extractMeta(document: AnyNode, normalizeWhitespace: boolean): MetaInfo {
  const meta: MetaInfo = { other: {} };
  const stack: AnyNode[] = [document];

  while (stack.length > 0) {
    const node = stack.pop() as AnyNode;
    if (node.type === "tag") {
      const element = node as Element;
      const tag = element.name.toLowerCase();

      if (tag === "html" && element.attribs?.lang && !meta.lang) {
        meta.lang = element.attribs.lang;
      }

      if (tag === "title" && !meta.title) {
        const titleText = collectDomText(element, normalizeWhitespace);
        if (titleText) {
          meta.title = titleText;
        }
      }

      if (tag === "meta") {
        const content = element.attribs?.content;
        if (content) {
          const name = (
            element.attribs?.name ||
            element.attribs?.property ||
            element.attribs?.["http-equiv"] ||
            ""
          )
            .toLowerCase()
            .trim();

          if (name === "description") {
            meta.description = meta.description ?? content;
          } else if (name === "keywords") {
            meta.keywords = meta.keywords ?? content;
          } else if (name) {
            meta.other[name] = content;
          }
        }
      }

      if (tag === "link") {
        const rel = element.attribs?.rel?.toLowerCase();
        if (rel && rel.split(/\s+/g).includes("canonical")) {
          const href = element.attribs?.href;
          if (href && !meta.canonicalUrl) {
            meta.canonicalUrl = href;
          }
        }
      }
    }

    const children = (node as Element).children ?? [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }

  return meta;
}

function shouldKeepAttribute(
  tag: string,
  attr: string,
  keepAttributes?: string[] | Record<string, string[]>
): boolean {
  if (!keepAttributes) {
    return false;
  }

  if (Array.isArray(keepAttributes)) {
    return keepAttributes.includes(attr);
  }

  const specific = keepAttributes[tag];
  if (specific?.includes(attr)) {
    return true;
  }

  const global = keepAttributes["*"];
  return global ? global.includes(attr) : false;
}

function filterAttributes(
  tag: string,
  attrs: Record<string, string> | undefined,
  keepAttributes?: string[] | Record<string, string[]>
): Record<string, string> | undefined {
  if (!attrs || !keepAttributes) {
    return undefined;
  }

  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (shouldKeepAttribute(tag, key, keepAttributes)) {
      filtered[key] = value;
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

export function cleanHtml(html: string, options: CleanOptions = {}): CleanDocument {
  const normalizeWhitespace = options.normalizeWhitespace ?? true;
  const removeTags = new Set(options.removeTags ?? DEFAULT_REMOVE_TAGS);
  const keepAttributes = options.keepAttributes ?? DEFAULT_KEEP_ATTRIBUTES;

  const document = parseDocument(html, {
    lowerCaseTags: true,
    lowerCaseAttributeNames: true,
    decodeEntities: true,
    recognizeSelfClosing: true,
  });

  const meta = extractMeta(document, normalizeWhitespace);
  const schema = extractSchemasFromDom(document, options);

  const nodes: CleanNode[] = [];
  const rootId = 0;
  nodes.push({ id: rootId, type: "root", children: [] });

  const stack: Array<{ node: AnyNode; parentId: number }> = [];
  const children = document.children ?? [];
  for (let i = children.length - 1; i >= 0; i -= 1) {
    stack.push({ node: children[i], parentId: rootId });
  }

  while (stack.length > 0) {
    const frame = stack.pop() as { node: AnyNode; parentId: number };
    const node = frame.node;

    if (node.type === "text") {
      const textNode = node as Text;
      const rawText = textNode.data;
      if (isEmptyText(rawText)) {
        continue;
      }

      const text = normalizeWhitespace ? collapseWhitespace(rawText) : rawText;
      if (!text) {
        continue;
      }

      const id = nodes.length;
      nodes.push({ id, type: "text", text, parent: frame.parentId });
      const parent = nodes[frame.parentId];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(id);
      continue;
    }

    if (node.type === "comment" && (options.dropComments ?? true)) {
      continue;
    }

    if (node.type === "tag" || node.type === "script" || node.type === "style") {
      const element = node as Element;
      const tag = element.name.toLowerCase();

      if (removeTags.has(tag)) {
        continue;
      }

      if (!options.includeHead && tag === "head") {
        continue;
      }

      if (!options.includeMetaTags && tag === "meta") {
        continue;
      }

      if (!options.includeTitleTag && tag === "title") {
        continue;
      }

      const id = nodes.length;
      const attrs = filterAttributes(tag, element.attribs, keepAttributes);
      nodes.push({
        id,
        type: "element",
        tag,
        attrs,
        parent: frame.parentId,
        children: [],
      });
      const parent = nodes[frame.parentId];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(id);

      const elementChildren = element.children ?? [];
      for (let i = elementChildren.length - 1; i >= 0; i -= 1) {
        stack.push({ node: elementChildren[i], parentId: id });
      }
    }
  }

  return {
    rootId,
    nodes,
    meta,
    schema,
    headings: [],
    links: [],
    stats: {
      wordCount: 0,
      uniqueWords: 0,
      textLength: 0,
      headingCounts: {},
      linkCount: 0,
    },
  };
}
