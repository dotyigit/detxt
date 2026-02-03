import type {
  CleanDocument,
  ImageAnalysisOptions,
  ImageAnalysisResult,
  ImageInfo,
  ImageSummary,
  UrlClassification,
} from "./types.js";

const DEFAULT_IGNORE_PROTOCOLS = ["mailto:", "tel:", "javascript:"];

function classifyUrl(
  url: string | undefined,
  baseUrl: string | undefined,
  ignoreProtocols: string[]
): UrlClassification {
  if (!url) {
    return "missing";
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return "missing";
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("data:") || lower.startsWith("blob:") || lower.startsWith("cid:")) {
    return "inline";
  }

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
      const urlObj = new URL(trimmed);
      const base = new URL(baseUrl);
      return urlObj.host === base.host ? "internal" : "external";
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
      const urlObj = new URL(`${base.protocol}${trimmed}`);
      return urlObj.host === base.host ? "internal" : "external";
    } catch {
      return "external";
    }
  }

  return "internal";
}

function buildNearestLinkIndex(document: CleanDocument): Int32Array {
  const nearest = new Int32Array(document.nodes.length);
  nearest.fill(-1);

  const stack: Array<{ nodeId: number; currentLink: number }> = [
    { nodeId: document.rootId, currentLink: -1 },
  ];

  while (stack.length > 0) {
    const frame = stack.pop() as { nodeId: number; currentLink: number };
    const node = document.nodes[frame.nodeId];

    let linkId = frame.currentLink;
    if (node.type === "element" && node.tag === "a") {
      linkId = node.id;
    }

    nearest[node.id] = linkId;

    const children = node.children ?? [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push({ nodeId: children[i], currentLink: linkId });
    }
  }

  return nearest;
}

function buildPath(
  document: CleanDocument,
  nodeId: number,
  maxDepth: number
): string {
  const parts: string[] = [];
  let current: number | undefined = nodeId;
  let depth = 0;

  while (current !== undefined && depth < maxDepth) {
    const node: CleanDocument["nodes"][number] = document.nodes[current];
    if (node.type === "element" && node.tag) {
      parts.push(node.tag);
    }
    current = node.parent;
    depth += 1;
  }

  return parts.reverse().join("> ");
}

export function analyzeImages(
  document: CleanDocument,
  options: ImageAnalysisOptions = {}
): ImageAnalysisResult {
  const ignoreProtocols = options.ignoreProtocols ?? DEFAULT_IGNORE_PROTOCOLS;
  const includePath = options.includePath ?? false;
  const pathMaxDepth = options.pathMaxDepth ?? 8;

  const nearestLinkIndex = buildNearestLinkIndex(document);

  const images: ImageInfo[] = [];
  const uniqueSrc = new Set<string>();

  let total = 0;
  let missingSrc = 0;
  let missingAlt = 0;
  let linkedImages = 0;
  let lazyImages = 0;
  let withSrcset = 0;
  let inlineImages = 0;
  let internalImages = 0;
  let externalImages = 0;
  let ignoredImages = 0;

  for (const node of document.nodes) {
    if (node.type !== "element" || node.tag !== "img") {
      continue;
    }

    total += 1;

    const src = node.attrs?.src;
    const dataSrc = node.attrs?.["data-src"];
    const srcset = node.attrs?.srcset;
    const dataSrcset = node.attrs?.["data-srcset"];
    const alt = node.attrs?.alt;
    const title = node.attrs?.title;
    const loading = node.attrs?.loading;
    const width = node.attrs?.width;
    const height = node.attrs?.height;

    const effectiveSrc = src || dataSrc || undefined;
    if (!effectiveSrc) {
      missingSrc += 1;
    } else {
      uniqueSrc.add(effectiveSrc);
    }

    const hasAlt = !!(alt && alt.trim());
    if (!hasAlt) {
      missingAlt += 1;
    }

    const hasSrcset = !!(srcset || dataSrcset);
    if (hasSrcset) {
      withSrcset += 1;
    }

    const isLazy = !!(
      (loading && loading.toLowerCase() === "lazy") ||
      (!src && dataSrc) ||
      (!srcset && dataSrcset)
    );
    if (isLazy) {
      lazyImages += 1;
    }

    const urlType = classifyUrl(effectiveSrc, options.baseUrl, ignoreProtocols);
    if (urlType === "inline") {
      inlineImages += 1;
    } else if (urlType === "internal") {
      internalImages += 1;
    } else if (urlType === "external") {
      externalImages += 1;
    } else if (urlType === "ignored") {
      ignoredImages += 1;
    }

    const linkNodeId = nearestLinkIndex[node.id];
    const linkNode = linkNodeId >= 0 ? document.nodes[linkNodeId] : undefined;
    const linkHref = linkNode?.attrs?.href;
    const linkRel = linkNode?.attrs?.rel;
    const isLinked = !!linkNode;
    if (isLinked) {
      linkedImages += 1;
    }

    const info: ImageInfo = {
      nodeId: node.id,
      src,
      alt,
      title,
      loading,
      width,
      height,
      srcset,
      dataSrc,
      dataSrcset,
      effectiveSrc,
      hasAlt,
      isLazy,
      isLinked,
      linkHref,
      linkRel,
      urlType,
    };

    if (includePath) {
      info.path = buildPath(document, node.id, pathMaxDepth);
    }

    images.push(info);
  }

  const summary: ImageSummary = {
    total,
    uniqueSrc: uniqueSrc.size,
    missingSrc,
    missingAlt,
    linkedImages,
    lazyImages,
    withSrcset,
    inlineImages,
    internalImages,
    externalImages,
    ignoredImages,
  };

  return { summary, images };
}
