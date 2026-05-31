import { describe, it, expect, afterAll } from "vitest";
import { query, disconnect } from "../src/db.js";
import { createCampaign, listCampaigns } from "../src/tools/campaigns.js";

describe("Campaigns", () => {
  let createdId: number;
  afterAll(async () => {
    if (createdId) {
      await query(`DELETE FROM "CampaignContentTypeMappings" WHERE "CampaignId" = $1`, [createdId]);
      await query(`DELETE FROM "Campaign" WHERE "Id" = $1`, [createdId]);
    }
    await disconnect();
  });

  it("should create a rating campaign", async () => {
    const result = await createCampaign({
      name: "TEST Rating Campaign",
      description: "Rate trends for relevance",
      type: 10,
      contentTypeIds: [2],
    });
    createdId = result.id;
    expect(result.id).toBeGreaterThan(0);
    expect(result.Name).toBe("TEST Rating Campaign");
  });

  it("should list campaigns", async () => {
    const result = await listCampaigns();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
