import { parseDocument } from "htmlparser2";
import type { AnyNode, Element, Text } from "domhandler";
import { collapseWhitespace } from "./utils.js";
import type {
  CleanOptions,
  JsonLdEntry,
  MicrodataItem,
  MicrodataValue,
  SchemaInfo,
} from "./types.js";

function getScriptText(element: Element): string {
  let text = "";
  const children = element.children ?? [];
  for (const child of children) {
    if (child.type === "text") {
      text += (child as Text).data;
    }
  }
  return text.trim();
}

function getElementText(element: Element, normalizeWhitespace: boolean): string {
  const parts: string[] = [];
  const stack: AnyNode[] = [element];

  while (stack.length > 0) {
    const node = stack.pop() as AnyNode;
    if (node.type === "text") {
      parts.push((node as Text).data);
      continue;
    }

    const children = (node as Element).children ?? [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }

  const raw = parts.join(" ");
  return normalizeWhitespace ? collapseWhitespace(raw) : raw.trim();
}

function extractJsonLd(document: AnyNode, options: CleanOptions): JsonLdEntry[] {
  if (options.extractJsonLd === false) {
    return [];
  }

  const includeRaw = options.includeJsonLdRaw ?? true;
  const parseJsonLd = options.parseJsonLd ?? true;

  const entries: JsonLdEntry[] = [];
  const stack: AnyNode[] = [document];

  while (stack.length > 0) {
    const node = stack.pop() as AnyNode;
    if (node.type === "tag" || node.type === "script") {
      const element = node as Element;
      const tag = element.name.toLowerCase();
      if (tag === "script") {
        const type = element.attribs?.type?.toLowerCase() ?? "";
        if (type.includes("ld+json")) {
          const raw = getScriptText(element);
          if (raw) {
            const entry: JsonLdEntry = {};
            if (includeRaw) {
              entry.raw = raw;
            }
            if (parseJsonLd) {
              try {
                entry.value = JSON.parse(raw);
              } catch (error) {
                entry.error = error instanceof Error ? error.message : "Invalid JSON";
              }
            }
            entries.push(entry);
          }
        }
      }
    }

    const children = (node as Element).children ?? [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }

  return entries;
}

function addProperty(
  item: MicrodataItem,
  name: string,
  value: MicrodataValue
): void {
  if (!item.properties[name]) {
    item.properties[name] = [];
  }
  item.properties[name].push(value);
}

function extractPropertyValue(element: Element, normalizeWhitespace: boolean): string {
  const attrs = element.attribs ?? {};
  const tag = element.name.toLowerCase();

  if (attrs.content) {
    return attrs.content;
  }

  if ((tag === "a" || tag === "area" || tag === "link") && attrs.href) {
    return attrs.href;
  }

  if (tag === "img" && attrs.src) {
    return attrs.src;
  }

  if (tag === "time" && attrs.datetime) {
    return attrs.datetime;
  }

  if ((tag === "audio" || tag === "video" || tag === "source") && attrs.src) {
    return attrs.src;
  }

  return getElementText(element, normalizeWhitespace);
}

function extractMicrodata(document: AnyNode, options: CleanOptions): MicrodataItem[] {
  if (options.extractMicrodata === false) {
    return [];
  }

  const normalizeWhitespace = options.normalizeWhitespace ?? true;
  const items: MicrodataItem[] = [];
  const itemStack: MicrodataItem[] = [];

  const stack: Array<{ node: AnyNode; entering: boolean; pushedItem: boolean }> = [
    { node: document, entering: true, pushedItem: false },
  ];

  while (stack.length > 0) {
    const frame = stack.pop() as { node: AnyNode; entering: boolean; pushedItem: boolean };
    const node = frame.node;

    if (frame.entering) {
      if (node.type === "root") {
        const children = (node as { children?: AnyNode[] }).children ?? [];
        for (let i = children.length - 1; i >= 0; i -= 1) {
          stack.push({ node: children[i], entering: true, pushedItem: false });
        }
        continue;
      }

      if (node.type === "tag" || node.type === "script") {
        const element = node as Element;
        const attrs = element.attribs ?? {};
        const hasItemscope = Object.prototype.hasOwnProperty.call(attrs, "itemscope");
        const itemprop = attrs.itemprop;
        let pushedItem = false;
        let newItem: MicrodataItem | undefined;

        if (hasItemscope) {
          const types = attrs.itemtype ? attrs.itemtype.split(/\s+/g).filter(Boolean) : [];
          newItem = {
            id: items.length,
            types,
            itemid: attrs.itemid,
            properties: {},
          };
          items.push(newItem);

          if (itemprop && itemStack.length > 0) {
            const names = itemprop.split(/\s+/g).filter(Boolean);
            for (const name of names) {
              addProperty(itemStack[itemStack.length - 1], name, {
                type: "item",
                itemId: newItem.id,
              });
            }
          }

          itemStack.push(newItem);
          pushedItem = true;
        }

        if (itemprop && itemStack.length > 0 && !hasItemscope) {
          const names = itemprop.split(/\s+/g).filter(Boolean);
          const value = extractPropertyValue(element, normalizeWhitespace);
          for (const name of names) {
            addProperty(itemStack[itemStack.length - 1], name, {
              type: "text",
              value,
            });
          }
        }

        stack.push({ node, entering: false, pushedItem });

        const children = element.children ?? [];
        for (let i = children.length - 1; i >= 0; i -= 1) {
          stack.push({ node: children[i], entering: true, pushedItem: false });
        }
      }
    } else if (frame.pushedItem) {
      itemStack.pop();
    }
  }

  return items;
}

export function extractSchemasFromDom(
  document: AnyNode,
  options: CleanOptions = {}
): SchemaInfo {
  return {
    jsonLd: extractJsonLd(document, options),
    microdata: extractMicrodata(document, options),
  };
}

export function extractSchemas(html: string, options: CleanOptions = {}): SchemaInfo {
  const document = parseDocument(html, {
    lowerCaseTags: true,
    lowerCaseAttributeNames: true,
    decodeEntities: true,
    recognizeSelfClosing: true,
  });

  return extractSchemasFromDom(document, options);
}
