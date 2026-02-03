import test from "node:test";
import assert from "node:assert/strict";
import { analyzeHtml } from "../dist/index.js";

const html = `
<!doctype html>
<html>
  <head><title>Heading Tree</title></head>
  <body>
    <h1>Main</h1>
    <p>Intro text.</p>
    <h2>Section A</h2>
    <h3>Subsection A.1</h3>
    <h2>Section B</h2>
    <h4>Subsection B.1</h4>
  </body>
</html>
`;

test("builds a hierarchical heading tree", () => {
  const doc = analyzeHtml(html);

  assert.equal(doc.headings.length, 5);
  assert.ok(doc.headingTree);
  assert.equal(doc.headingTree.length, 1);

  const main = doc.headingTree[0];
  assert.equal(main.level, 1);
  assert.equal(main.text, "Main");
  assert.equal(main.children.length, 2);

  const sectionA = main.children[0];
  assert.equal(sectionA.level, 2);
  assert.equal(sectionA.text, "Section A");
  assert.equal(sectionA.children.length, 1);
  assert.equal(sectionA.children[0].level, 3);
  assert.equal(sectionA.children[0].text, "Subsection A.1");

  const sectionB = main.children[1];
  assert.equal(sectionB.level, 2);
  assert.equal(sectionB.text, "Section B");
  assert.equal(sectionB.children.length, 1);
  assert.equal(sectionB.children[0].level, 4);
  assert.equal(sectionB.children[0].text, "Subsection B.1");
});
