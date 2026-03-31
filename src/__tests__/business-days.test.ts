import { describe, it, expect } from "vitest";
import { addBusinessDays, businessDaysBetween } from "@/lib/business-days";

describe("addBusinessDays", () => {
  it("adds 1 business day on a regular weekday", () => {
    // 2026-03-30 is Monday
    expect(addBusinessDays("2026-03-30", 1)).toBe("2026-03-31");
  });

  it("skips weekend days", () => {
    // 2026-03-27 is Friday, +1 business day = Monday 2026-03-30
    expect(addBusinessDays("2026-03-27", 1)).toBe("2026-03-30");
  });

  it("skips weekends for multi-day spans", () => {
    // 2026-03-27 Friday +5 = next Friday 2026-04-03
    expect(addBusinessDays("2026-03-27", 5)).toBe("2026-04-03");
  });

  it("handles 15 business days (PROFEPA notification deadline)", () => {
    // 2026-03-02 Monday + 15 business days (not counting start) = 2026-03-24 Tuesday
    // (March 16 is 3rd Monday = Benito Juárez holiday)
    expect(addBusinessDays("2026-03-02", 15)).toBe("2026-03-24");
  });

  it("skips New Year holiday", () => {
    // 2025-12-31 Wednesday +1 = skip Jan 1 → 2026-01-02 Friday
    expect(addBusinessDays("2025-12-31", 1)).toBe("2026-01-02");
  });

  it("skips Labor Day (May 1st)", () => {
    // 2026-04-30 Thursday → +1 → skip May 1 → May 4 Monday
    expect(addBusinessDays("2026-04-30", 1)).toBe("2026-05-04");
  });

  it("skips Independence Day (Sep 16)", () => {
    // 2026-09-15 Tuesday → +1 → skip Sep 16 → Sep 17 Thursday
    expect(addBusinessDays("2026-09-15", 1)).toBe("2026-09-17");
  });

  it("skips Christmas (Dec 25)", () => {
    // 2026-12-24 Thursday → +1 → skip Dec 25 + weekend → Dec 28 Monday
    expect(addBusinessDays("2026-12-24", 1)).toBe("2026-12-28");
  });

  it("handles first Monday of February (Constitution Day)", () => {
    // 2026-02-02 is a Monday → first Monday of Feb → holiday
    // 2026-01-30 Friday +3 → skip weekend + skip Feb 2 holiday → Feb 5
    expect(addBusinessDays("2026-01-30", 3)).toBe("2026-02-05");
  });

  it("returns same date for 0 days", () => {
    expect(addBusinessDays("2026-03-30", 0)).toBe("2026-03-30");
  });
});

describe("businessDaysBetween", () => {
  it("counts business days in a single week", () => {
    // Mon to Fri = 4 business days (exclusive of start)
    expect(businessDaysBetween("2026-03-30", "2026-04-03")).toBe(4);
  });

  it("returns 0 for same day", () => {
    expect(businessDaysBetween("2026-03-30", "2026-03-30")).toBe(0);
  });

  it("returns negative for reversed dates", () => {
    expect(businessDaysBetween("2026-04-03", "2026-03-30")).toBe(-4);
  });

  it("excludes weekends from count", () => {
    // Friday to Monday (exclusive) = 1 business day (only Monday)
    expect(businessDaysBetween("2026-03-27", "2026-03-30")).toBe(1);
  });

  it("counts two full weeks correctly", () => {
    // 2026-03-16 Mon to 2026-03-27 Fri = 9 business days
    expect(businessDaysBetween("2026-03-16", "2026-03-27")).toBe(9);
  });
});
