import { buildIndex } from "./indexer.js";
import type { CleanDocument, SeoOptions, SeoSummary } from "./types.js";

const DEFAULT_IGNORE_PROTOCOLS = ["mailto:", "tel:", "javascript:"];

function hasRelValue(rel: string | undefined, value: string): boolean {
  if (!rel) {
    return false;
  }
  return rel
    .toLowerCase()
    .split(/\s+/g)
    .includes(value);
}

function classifyHref(
  href: string,
  baseUrl: string | undefined,
  ignoreProtocols: string[]
): "internal" | "external" | "ignored" | "missing" {
  const trimmed = href.trim();
  if (!trimmed) {
    return "missing";
  }

  const lower = trimmed.toLowerCase();
  for (const protocol of ignoreProtocols) {
    if (lower.startsWith(protocol)) {
      return "ignored";
    }
  }

  if (lower.startsWith("#")) {
    return "internal";
  }

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    if (!baseUrl) {
      return "external";
    }
    try {
      const hrefUrl = new URL(trimmed);
      const base = new URL(baseUrl);
      return hrefUrl.host === base.host ? "internal" : "external";
    } catch {
      return "external";
    }
  }

  if (lower.startsWith("//")) {
    if (!baseUrl) {
      return "external";
    }
    try {
      const base = new URL(baseUrl);
      const hrefUrl = new URL(`${base.protocol}${trimmed}`);
      return hrefUrl.host === base.host ? "internal" : "external";
    } catch {
      return "external";
    }
  }

  return "internal";
}

export function analyzeSeo(
  document: CleanDocument,
  options: SeoOptions = {}
): SeoSummary {
  if (!document.index) {
    buildIndex(document);
  }

  const titleLength = document.meta.title ? document.meta.title.length : 0;
  const descriptionLength = document.meta.description
    ? document.meta.description.length
    : 0;

  const headingCounts = document.stats.headingCounts ?? {};
  const h1Count = headingCounts.h1 ?? 0;

  const ignoreProtocols = options.ignoreProtocols ?? DEFAULT_IGNORE_PROTOCOLS;

  let internalLinks = 0;
  let externalLinks = 0;
  let nofollowLinks = 0;
  let ignoredLinks = 0;
  let linksMissingHref = 0;

  const links = document.links ?? [];
  for (const link of links) {
    if (!link.href) {
      linksMissingHref += 1;
      continue;
    }

    if (hasRelValue(link.rel, "nofollow")) {
      nofollowLinks += 1;
    }

    const classification = classifyHref(link.href, options.baseUrl, ignoreProtocols);
    if (classification === "internal") {
      internalLinks += 1;
    } else if (classification === "external") {
      externalLinks += 1;
    } else if (classification === "ignored") {
      ignoredLinks += 1;
    } else {
      linksMissingHref += 1;
    }
  }

  let imageCount = 0;
  let imagesMissingAlt = 0;
  let canonicalUrl: string | undefined = document.meta.canonicalUrl;

  for (const node of document.nodes) {
    if (node.type !== "element") {
      continue;
    }

    if (node.tag === "img") {
      imageCount += 1;
      const alt = node.attrs?.alt;
      if (!alt || !alt.trim()) {
        imagesMissingAlt += 1;
      }
    }

    if (!canonicalUrl && node.tag === "link") {
      const rel = node.attrs?.rel;
      if (rel && hasRelValue(rel, "canonical")) {
        canonicalUrl = node.attrs?.href;
      }
    }
  }

  return {
    titleLength,
    descriptionLength,
    wordCount: document.stats.wordCount,
    uniqueWords: document.stats.uniqueWords,
    h1Count,
    headingCounts,
    linkCount: document.stats.linkCount,
    internalLinks,
    externalLinks,
    nofollowLinks,
    ignoredLinks,
    linksMissingHref,
    imageCount,
    imagesMissingAlt,
    canonicalUrl,
  };
}
