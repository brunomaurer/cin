import { describe, it, expect, afterAll } from "vitest";
import { query, disconnect } from "../src/db.js";
import { createRelations, listRelations } from "../src/tools/relations.js";

describe("Relations", () => {
  afterAll(async () => {
    await query(`DELETE FROM "Relation" WHERE "Note" LIKE 'TEST_%'`);
    await disconnect();
  });

  it("should create a relation between two content items", async () => {
    const result = await createRelations([
      { leftContentId: 2, rightContentId: 3, notes: "TEST_AI enables digital twin simulation" },
    ]);
    expect(result.length).toBe(1);
    expect(result[0].Id).toBeGreaterThan(0);
  });

  it("should list relations for a content item", async () => {
    const result = await listRelations(2);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
