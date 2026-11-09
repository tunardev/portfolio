import { describe, expect, test } from "bun:test";

import { calculateAge } from "@/lib/calculate-age";

const BIRTH_DATE = "2008-02-23";

describe("calculateAge", () => {
  test("the day before the birthday is still the previous age", () => {
    expect(calculateAge(BIRTH_DATE, new Date("2027-02-22T23:59:59Z"))).toBe(18);
  });

  test("the age increases on the birthday itself", () => {
    expect(calculateAge(BIRTH_DATE, new Date("2027-02-23T00:00:00Z"))).toBe(19);
  });

  test("a later month in the same year counts the birthday as passed", () => {
    expect(calculateAge(BIRTH_DATE, new Date("2026-11-09T12:00:00Z"))).toBe(18);
  });

  test("an earlier month in the year has not reached the birthday", () => {
    expect(calculateAge(BIRTH_DATE, new Date("2027-01-31T12:00:00Z"))).toBe(18);
  });
});
