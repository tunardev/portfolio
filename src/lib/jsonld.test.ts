import { describe, expect, test } from "bun:test";
import { jsonLdScript } from "./jsonld";

const ESCAPED = "\\u003c";

describe("jsonLdScript preserves the value", () => {
  test("a plain object round-trips unchanged", () => {
    const value = { "@context": "https://schema.org", "@type": "Person", name: "Tunar", sameAs: ["https://tunar.dev"] };
    expect(JSON.parse(jsonLdScript(value))).toEqual(value);
  });

  test("nested arrays and objects round-trip unchanged", () => {
    const value = { a: [1, 2, { b: null, c: true }], d: { e: { f: "g" } } };
    expect(JSON.parse(jsonLdScript(value))).toEqual(value);
  });

  test("primitives round-trip unchanged", () => {
    expect(JSON.parse(jsonLdScript("plain"))).toBe("plain");
    expect(JSON.parse(jsonLdScript(42))).toBe(42);
    expect(JSON.parse(jsonLdScript(null))).toBe(null);
  });
});

describe("jsonLdScript cannot close the script tag", () => {
  test("a closing script tag in a value never appears literally", () => {
    const output = jsonLdScript({ name: "</script><img src=x onerror=alert(1)>" });
    expect(output).not.toContain("</script>");
    expect(output).toContain(`${ESCAPED}/script>`);
  });

  test("a closing script tag in a key never appears literally", () => {
    const output = jsonLdScript({ "</script>": "value" });
    expect(output).not.toContain("</script>");
  });

  test("a closing script tag nested deep in the value never appears literally", () => {
    const output = jsonLdScript({ a: { b: [{ c: ["</script>"] }] } });
    expect(output).not.toContain("</script>");
  });

  test("an opening script tag never appears literally", () => {
    const output = jsonLdScript({ name: "<script>alert(1)</script>" });
    expect(output).not.toContain("<script>");
    expect(output).not.toContain("</script>");
  });

  test("every raw angle bracket in the value is escaped, none missed", () => {
    const value = { a: "<", b: ["<<<"], c: { d: "<!--" }, "<e>": "<f>" };
    const raw = JSON.stringify(value).split("<").length - 1;
    const output = jsonLdScript(value);
    expect(raw).toBe(7);
    expect(output).not.toContain("<");
    expect(output.split(ESCAPED)).toHaveLength(raw + 1);
  });
});

describe("jsonLdScript stays valid json", () => {
  test("escaping a closing script tag leaves parseable json", () => {
    const value = { name: "</script>", note: "a < b" };
    expect(JSON.parse(jsonLdScript(value))).toEqual(value);
  });

  test("escaping angle brackets in keys leaves parseable json", () => {
    const value = { "<key>": "<value>" };
    expect(JSON.parse(jsonLdScript(value))).toEqual(value);
  });

  test("an already-escaped sequence in the source string is not double-escaped", () => {
    const value = { name: "\\u003cscript\\u003e" };
    const output = jsonLdScript(value);
    expect(output).not.toContain("<");
    expect(JSON.parse(output)).toEqual(value);
  });
});
