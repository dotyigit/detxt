import test from "node:test";
import assert from "node:assert/strict";
import { cleanHtml } from "../dist/index.js";

const html = `
<!doctype html>
<html>
  <head>
    <script>console.log("x")</script>
    <style>.hidden{display:none}</style>
  </head>
  <body>
    <p>Visible text</p>
  </body>
</html>
`;

test("cleanHtml removes script and style nodes by default", () => {
  const doc = cleanHtml(html);
  const tags = doc.nodes
    .filter((node) => node.type === "element")
    .map((node) => node.tag);

  assert.ok(!tags.includes("script"));
  assert.ok(!tags.includes("style"));
});
