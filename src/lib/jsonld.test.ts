import { describe, expect, test } from "bun:test";
import { jsonLdScript } from "./jsonld";

const ESCAPED = "\\u003c";

describe("jsonLdScript round-trip", () => {
  test("preserves plain object", () => {
    const value = { "@context": "https://schema.org", "@type": "Person", name: "Tunar", sameAs: ["https://tunar.dev"] };
    expect(JSON.parse(jsonLdScript(value))).toEqual(value);
  });

  test("preserves nested arrays and objects", () => {
    const value = { a: [1, 2, { b: null, c: true }], d: { e: { f: "g" } } };
    expect(JSON.parse(jsonLdScript(value))).toEqual(value);
  });

  test("preserves primitives", () => {
    expect(JSON.parse(jsonLdScript("plain"))).toBe("plain");
    expect(JSON.parse(jsonLdScript(42))).toBe(42);
    expect(JSON.parse(jsonLdScript(null))).toBe(null);
  });
});

describe("jsonLdScript script tag escaping", () => {
  test("escapes closing script tag in value", () => {
    const output = jsonLdScript({ name: "</script><img src=x onerror=alert(1)>" });
    expect(output).not.toContain("</script>");
    expect(output).toContain(`${ESCAPED}/script>`);
  });

  test("escapes closing script tag in key", () => {
    const output = jsonLdScript({ "</script>": "value" });
    expect(output).not.toContain("</script>");
  });

  test("escapes nested closing script tag", () => {
    const output = jsonLdScript({ a: { b: [{ c: ["</script>"] }] } });
    expect(output).not.toContain("</script>");
  });

  test("escapes opening script tag", () => {
    const output = jsonLdScript({ name: "<script>alert(1)</script>" });
    expect(output).not.toContain("<script>");
    expect(output).not.toContain("</script>");
  });

  test("escapes every angle bracket", () => {
    const value = { a: "<", b: ["<<<"], c: { d: "<!--" }, "<e>": "<f>" };
    const raw = JSON.stringify(value).split("<").length - 1;
    const output = jsonLdScript(value);
    expect(raw).toBe(7);
    expect(output).not.toContain("<");
    expect(output.split(ESCAPED)).toHaveLength(raw + 1);
  });
});

describe("jsonLdScript JSON validity", () => {
  test("returns parseable JSON after escaping script tag", () => {
    const value = { name: "</script>", note: "a < b" };
    expect(JSON.parse(jsonLdScript(value))).toEqual(value);
  });

  test("returns parseable JSON after escaping keys", () => {
    const value = { "<key>": "<value>" };
    expect(JSON.parse(jsonLdScript(value))).toEqual(value);
  });

  test("does not double-escape escaped sequences", () => {
    const value = { name: "\\u003cscript\\u003e" };
    const output = jsonLdScript(value);
    expect(output).not.toContain("<");
    expect(JSON.parse(output)).toEqual(value);
  });
});
