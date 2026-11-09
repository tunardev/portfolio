import { describe, expect, test } from "bun:test";

import { calculateAge } from "@/lib/calculate-age";

const BIRTH_DATE = "2008-02-23";

describe("calculateAge", () => {
  test("returns previous age day before birthday", () => {
    expect(calculateAge(BIRTH_DATE, new Date("2027-02-22T23:59:59Z"))).toBe(18);
  });

  test("increments on birthday", () => {
    expect(calculateAge(BIRTH_DATE, new Date("2027-02-23T00:00:00Z"))).toBe(19);
  });

  test("returns current age after birthday month", () => {
    expect(calculateAge(BIRTH_DATE, new Date("2026-11-09T12:00:00Z"))).toBe(18);
  });

  test("returns previous age before birthday month", () => {
    expect(calculateAge(BIRTH_DATE, new Date("2027-01-31T12:00:00Z"))).toBe(18);
  });
});
