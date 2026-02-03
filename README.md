# detxt

[![CI](https://github.com/dotyigit/detxt/actions/workflows/ci.yml/badge.svg)](https://github.com/dotyigit/detxt/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/detxt)](https://www.npmjs.com/package/detxt)
[![license](https://img.shields.io/npm/l/detxt)](https://github.com/dotyigit/detxt/blob/main/LICENSE)

High-performance HTML cleaning and SEO/keyword analysis for AI pipelines. The library builds a compact node tree, removes non-content nodes, and provides fast keyword/search utilities.

## Features

- Compact node tree with numeric IDs and children arrays.
- Aggressive removal of non-content tags (script, style, svg, etc.) by default.
- Fast keyword search with word-set, `indexOf`, or Aho-Corasick strategies.
- Built-in heading extraction and hierarchical heading tree.
- Lightweight dependency footprint (only `htmlparser2`).

## Install

```bash
npm install detxt
```

## Quick Start

```ts
import { analyzeHtml, searchKeywords } from "detxt";

const html = "<html><head><title>Example</title></head><body><h1>Hello</h1><p>Fast parsing.</p></body></html>";
const document = analyzeHtml(html);

console.log(document.meta.title); // "Example"
console.log(document.headings); // [{ level: 1, text: "Hello", nodeId: ... }]

const result = searchKeywords(document, ["fast", "hello"], {
  matchWholeWords: true,
});

console.log(result.hits.fast?.count); // 1
```

## Heading Tree

```ts
import { analyzeHtml } from "detxt";

const html = `
  <h1>Main</h1>
  <h2>Section A</h2>
  <h3>Subsection A.1</h3>
  <h2>Section B</h2>
`;

const document = analyzeHtml(html);
console.log(document.headingTree);
```

The heading tree is a nested structure of `{ level, text, nodeId, children }` built from `<h1>`–`<h6>` elements.

## Heading Sections

```ts
import { analyzeHtml, buildHeadingSections } from "detxt";

const document = analyzeHtml(html);
const sections = buildHeadingSections(document);

console.log(sections);
```

Heading sections group the text content that follows each heading until the next heading of the same or higher level. Each section is `{ level, text, nodeId, content, children }`.

If you want sections built during indexing:

```ts
const document = analyzeHtml(html, {
  indexOptions: { buildHeadingSections: true }
});
```

## Keyword Research

```ts
import { analyzeHtml, getTopWords, searchKeywords } from "detxt";

const document = analyzeHtml(html);

const topWords = getTopWords(document.index, {
  limit: 10,
  minLength: 4,
});

const keywords = searchKeywords(document, ["seo", "html", "ai"], {
  matchWholeWords: true,
});
```

## SEO Summary

```ts
import { analyzeHtml, analyzeSeo } from "detxt";

const document = analyzeHtml(html);
const summary = analyzeSeo(document, { baseUrl: "https://example.com" });

console.log(summary);
```

The summary includes title/meta lengths, heading counts, internal vs external links, nofollow links, image alt coverage, and canonical URL.

## API Overview

- `cleanHtml(html, options)`
- `analyzeHtml(html, options)`
- `buildIndex(document, options)`
- `buildHeadingTree(document)`
- `buildHeadingSections(document, options)`
- `searchKeywords(documentOrIndex, keywords, options)`
- `containsKeyword(documentOrIndex, keyword, options)`
- `getTopWords(index, options)`
- `analyzeSeo(document, options)`

See `src/types.ts` for full option and type definitions.

## Options Highlights

- `CleanOptions.removeTags` overrides the default removal list.
- `CleanOptions.keepAttributes` defaults to a minimal SEO-friendly set (`href`, `rel`, `alt`, `src`). Use `[]` to drop all attributes.
- `IndexOptions.buildTagIndex` builds a `tag -> nodeId[]` map for fast lookups.
- `IndexOptions.buildHeadingSections` builds heading sections during indexing.
- `KeywordSearchOptions.strategy` chooses `wordset`, `indexOf`, or `aho-corasick`.
- `KeywordSearchOptions.matchWholeWords` uses word boundaries for accurate counts.
- `SeoOptions.baseUrl` enables internal vs external link classification.

## Testing

```bash
npm test
```

## Versioning

This project follows SemVer. Use `npm version patch|minor|major` to bump versions.

## CI

GitHub Actions runs build and tests on every push and pull request. The badge above reflects the latest status.

## Release (Git Tag Flow)

This repo publishes to npm automatically when you push a Git tag that matches the package version.

1. Make sure your npm token is saved in GitHub as a secret named `NPM_TOKEN`.
2. Bump version and create tag:
   - `npm version patch` (or `minor` / `major`)
3. Push commits and tag:
   - `git push origin main --tags`

When the `vX.Y.Z` tag is pushed, GitHub Actions runs tests and publishes the package.
