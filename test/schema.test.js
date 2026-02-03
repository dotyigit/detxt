import test from "node:test";
import assert from "node:assert/strict";
import { analyzeHtml } from "../dist/index.js";

const html = `
<!doctype html>
<html>
  <head>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Organization","name":"Example"}
    </script>
    <script type="application/ld+json">{"bad":</script>
  </head>
  <body>
    <div itemscope itemtype="https://schema.org/Product">
      <span itemprop="name">Widget</span>
      <img itemprop="image" src="/img/widget.jpg">
      <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
        <meta itemprop="price" content="19.99">
      </div>
    </div>
  </body>
</html>
`;

test("extracts json-ld and microdata", () => {
  const doc = analyzeHtml(html);
  const schema = doc.schema;

  assert.ok(schema);
  assert.equal(schema.jsonLd.length, 2);
  assert.equal(schema.jsonLd[0].value?.["@type"], "Organization");
  assert.ok(schema.jsonLd[1].error);

  assert.equal(schema.microdata.length, 2);
  const product = schema.microdata[0];
  assert.equal(product.types[0], "https://schema.org/Product");
  assert.equal(product.properties.name[0].value, "Widget");
  assert.equal(product.properties.image[0].value, "/img/widget.jpg");

  const offer = schema.microdata[1];
  assert.equal(offer.types[0], "https://schema.org/Offer");
  assert.equal(offer.properties.price[0].value, "19.99");
});
