import { describe, it, expect, afterAll } from "vitest";
import { query, disconnect } from "../src/db.js";

describe("Database Connection", () => {
  afterAll(async () => {
    await disconnect();
  });

  it("should connect and query", async () => {
    const result = await query("SELECT 1 AS value");
    expect(result.rows[0].value).toBe(1);
  });

  it("should see the Content table", async () => {
    const result = await query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'Content'`
    );
    expect(result.rows.length).toBe(1);
  });
});
