import test from "node:test";
import assert from "node:assert/strict";
import { analyzeHtml, searchKeywords } from "../dist/index.js";

const html = `
<!doctype html>
<html>
  <body>
    <p>Fast HTML parsing for SEO and AI pipelines.</p>
    <p>HTML parsing should be fast and accurate.</p>
  </body>
</html>
`;

test("searchKeywords counts words and phrases", () => {
  const doc = analyzeHtml(html);

  const result = searchKeywords(doc, ["html", "seo", "fast html"], {
    matchWholeWords: true,
    matchPhrases: true,
  });

  assert.equal(result.hits["html"].count, 2);
  assert.equal(result.hits["seo"].count, 1);
  assert.equal(result.hits["fast html"].count, 1);
  assert.equal(result.totalHits, 4);
});
