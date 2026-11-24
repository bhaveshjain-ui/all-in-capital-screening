import { describe, it, expect } from "vitest";
import { fmtDate, fmtDateTime } from "../lib/time";

describe("times are always shown in India time", () => {
  it("shows 2:46 pm UTC as 8:16 pm in Mumbai", () => {
    expect(fmtDateTime("2026-11-24T14:46:23.000Z")).toBe("24/11/2026, 8:16:23 pm");
  });
  it("moves the date forward when India is already on the next day", () => {
    // 22:00 UTC on 30 Nov is 3:30 am on 1 Dec in India.
    expect(fmtDate("2026-11-30T22:00:00.000Z")).toBe("1/12/2026");
    expect(fmtDateTime("2026-11-30T22:00:00.000Z")).toBe("1/12/2026, 3:30:00 am");
  });
  it("does not depend on the machine's own time zone", () => {
    const saved = process.env.TZ;
    try {
      for (const tz of ["UTC", "America/Los_Angeles", "Asia/Kolkata"]) {
        process.env.TZ = tz;
        expect(fmtDateTime("2026-11-24T14:46:23.000Z")).toBe("24/11/2026, 8:16:23 pm");
      }
    } finally {
      if (saved === undefined) delete process.env.TZ; else process.env.TZ = saved;
    }
  });
});
