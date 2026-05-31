import { describe, it, expect, afterAll } from "vitest";
import { query, disconnect } from "../src/db.js";
import {
  createContentItem,
  listContentItems,
  getContentDetails,
  updateContentItem,
} from "../src/tools/content-items.js";

describe("Content Items", () => {
  let createdId: number;

  afterAll(async () => {
    if (createdId) {
      await query(`DELETE FROM "WidgetValues" WHERE "ContentId" = $1`, [createdId]);
      await query(`DELETE FROM "Content" WHERE "Id" = $1`, [createdId]);
    }
    await disconnect();
  });

  it("should create a content item with widget values", async () => {
    const result = await createContentItem({
      contentTypeId: 2,
      name: "TEST Blockchain",
      abstract: "Distributed ledger technology",
      widgets: {
        2: { textValue: "Blockchain enables decentralized trust." },
        3: { intValue: 1 },
        4: { intValue: 80 },
        5: { dateValue: "2024-03-15" },
      },
    });

    createdId = result.id;
    expect(result.id).toBeGreaterThan(0);
    expect(result.name).toBe("TEST Blockchain");
    expect(result.uid).toBeDefined();
  });

  it("should list content items", async () => {
    const result = await listContentItems({ contentTypeId: 2 });
    expect(result.length).toBeGreaterThanOrEqual(1);
    const blockchain = result.find((i: any) => i.name === "TEST Blockchain");
    expect(blockchain).toBeDefined();
  });

  it("should get content details with widgets", async () => {
    const result = await getContentDetails(createdId);
    expect(result.name).toBe("TEST Blockchain");
    expect(result.widgets).toBeDefined();
    expect(result.widgets.length).toBeGreaterThan(0);
  });

  it("should update a content item", async () => {
    await updateContentItem({
      id: createdId,
      name: "TEST Blockchain Updated",
      widgets: {
        4: { intValue: 85 },
      },
    });
    const updated = await getContentDetails(createdId);
    expect(updated.name).toBe("TEST Blockchain Updated");
  });
});
