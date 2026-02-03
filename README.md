# detxt

High-performance HTML cleaning and SEO/keyword analysis for AI pipelines. The library builds a compact node tree, removes non-content nodes, and provides fast keyword/search utilities.

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

## Design Notes

- **Compact tree**: Nodes are stored in a flat array with `children` pointing to node IDs.
- **Fast keyword lookup**: Uses word counts for whole-word search, and Aho-Corasick for large keyword sets.
- **Low dependency**: Only `htmlparser2` is required.

## Main APIs

- `cleanHtml(html, options)`
- `analyzeHtml(html, options)`
- `buildIndex(document, options)`
- `searchKeywords(documentOrIndex, keywords, options)`
- `containsKeyword(documentOrIndex, keyword, options)`
- `getTopWords(index, options)`

See `src/types.ts` for full option and type definitions.
