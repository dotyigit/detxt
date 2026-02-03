import test from "node:test";
import assert from "node:assert/strict";
import { analyzeHtml, buildHeadingSections } from "../dist/index.js";

const html = `
<!doctype html>
<html>
  <body>
    <h1>Main</h1>
    <p>Intro text.</p>
    <h2>Section A</h2>
    <p>Alpha content.</p>
    <h3>Subsection A.1</h3>
    <p>Deep content.</p>
    <h2>Section B</h2>
    <p>Beta content.</p>
  </body>
</html>
`;

test("buildHeadingSections groups content under headings", () => {
  const doc = analyzeHtml(html);
  const sections = buildHeadingSections(doc);

  assert.equal(sections.length, 1);
  const main = sections[0];
  assert.equal(main.text, "Main");
  assert.equal(main.content, "Intro text.");

  assert.equal(main.children.length, 2);
  const sectionA = main.children[0];
  assert.equal(sectionA.text, "Section A");
  assert.equal(sectionA.content, "Alpha content.");
  assert.equal(sectionA.children.length, 1);
  assert.equal(sectionA.children[0].text, "Subsection A.1");
  assert.equal(sectionA.children[0].content, "Deep content.");

  const sectionB = main.children[1];
  assert.equal(sectionB.text, "Section B");
  assert.equal(sectionB.content, "Beta content.");
});
