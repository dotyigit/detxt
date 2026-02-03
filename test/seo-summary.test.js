import test from "node:test";
import assert from "node:assert/strict";
import { analyzeHtml, analyzeSeo } from "../dist/index.js";

const html = `
<!doctype html>
<html>
  <head>
    <title>Test</title>
    <meta name="description" content="Desc here">
    <link rel="canonical" href="https://example.com/page">
  </head>
  <body>
    <h1>Main</h1>
    <a href="/internal">Internal</a>
    <a href="https://other.com" rel="nofollow">External</a>
    <a href="mailto:hi@example.com">Email</a>
    <a>Missing</a>
    <img src="a.jpg" alt="Hero">
    <img src="b.jpg">
  </body>
</html>
`;

test("analyzeSeo summarizes link and image signals", () => {
  const doc = analyzeHtml(html);
  const summary = analyzeSeo(doc, { baseUrl: "https://example.com" });

  assert.equal(summary.titleLength, 4);
  assert.equal(summary.descriptionLength, 9);
  assert.equal(summary.h1Count, 1);
  assert.equal(summary.linkCount, 4);
  assert.equal(summary.internalLinks, 1);
  assert.equal(summary.externalLinks, 1);
  assert.equal(summary.nofollowLinks, 1);
  assert.equal(summary.ignoredLinks, 1);
  assert.equal(summary.linksMissingHref, 1);
  assert.equal(summary.imageCount, 2);
  assert.equal(summary.imagesMissingAlt, 1);
  assert.equal(summary.canonicalUrl, "https://example.com/page");
});
