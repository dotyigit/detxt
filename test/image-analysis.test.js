import test from "node:test";
import assert from "node:assert/strict";
import { analyzeHtml, analyzeImages } from "../dist/index.js";

const html = `
<!doctype html>
<html>
  <body>
    <a href="/product"><img src="/a.jpg" alt="A" width="100" height="50"></a>
    <img data-src="https://cdn.example.com/b.jpg" loading="lazy">
    <img src="data:image/png;base64,AAAA" alt="Inline">
  </body>
</html>
`;

test("analyzeImages summarizes image attributes", () => {
  const doc = analyzeHtml(html);
  const result = analyzeImages(doc, { baseUrl: "https://example.com" });

  assert.equal(result.summary.total, 3);
  assert.equal(result.summary.uniqueSrc, 3);
  assert.equal(result.summary.linkedImages, 1);
  assert.equal(result.summary.lazyImages, 1);
  assert.equal(result.summary.inlineImages, 1);
  assert.equal(result.summary.internalImages, 1);
  assert.equal(result.summary.externalImages, 1);
  assert.equal(result.summary.missingAlt, 1);

  const first = result.images[0];
  assert.equal(first.isLinked, true);
  assert.equal(first.linkHref, "/product");
  assert.equal(first.hasAlt, true);
});
