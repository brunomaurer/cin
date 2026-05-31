import { describe, it, expect, afterAll } from "vitest";
import { query, disconnect } from "../src/db.js";
import { listContentTypes, createContentType } from "../src/tools/content-types.js";

describe("Content Types", () => {
  afterAll(async () => {
    await query(`DELETE FROM "WidgetContentTypeMappings" WHERE "ContentTypeId" IN (SELECT "Id" FROM "ContentType" WHERE "Name" LIKE 'TEST_%')`);
    await query(`DELETE FROM "UserContentType" WHERE "ContentTypeId" IN (SELECT "Id" FROM "ContentType" WHERE "Name" LIKE 'TEST_%')`);
    await query(`DELETE FROM "UserRoles" WHERE "ContentTypeId" IN (SELECT "Id" FROM "ContentType" WHERE "Name" LIKE 'TEST_%')`);
    await query(`DELETE FROM "ContentType" WHERE "Name" LIKE 'TEST_%'`);
    await disconnect();
  });

  it("should list existing content types", async () => {
    const result = await listContentTypes();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.find((ct: any) => ct.name === "Trend")).toBeDefined();
  });

  it("should create a new content type with widgets", async () => {
    const result = await createContentType({
      name: "TEST_Technology",
      description: "Test content type",
      widgets: [
        { name: "Summary", fieldType: 5, required: true },
        { name: "Impact Score", fieldType: 10, required: false },
        { name: "Maturity", fieldType: 45, required: false, options: ["Early", "Growth", "Mature"] },
      ],
    });

    expect(result.id).toBeGreaterThan(0);
    expect(result.name).toBe("TEST_Technology");
    expect(result.widgets.length).toBe(3);
    expect(result.widgets[0].name).toBe("Summary");
    expect(result.widgets[2].options).toHaveLength(3);
  });
});
