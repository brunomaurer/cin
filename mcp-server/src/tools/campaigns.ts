import { query, getClient } from "../db.js";
import { CampaignStatusEnum } from "../helpers/enums.js";

const ADMIN_USER_ID = 1000000000;

interface CreateCampaignInput {
  name: string;
  description?: string;
  type: number;
  contentTypeIds?: number[];
  extendedConfig?: string;
}

export async function createCampaign(input: CreateCampaignInput) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO "Campaign" ("Name", "Description", "Type", "Status", "ExtendedConfig", "CreatedUserId", "CreatedOn")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING "Id", "Name", "Type", "Status"`,
      [input.name, input.description || null, input.type, CampaignStatusEnum.Draft, input.extendedConfig || null, ADMIN_USER_ID]
    );
    const campaignId = result.rows[0].Id;
    if (input.contentTypeIds) {
      for (const ctId of input.contentTypeIds) {
        await client.query(
          `INSERT INTO "CampaignContentTypeMappings" ("CampaignId", "ContentTypeId", "CreatedUserId", "CreatedOn")
           VALUES ($1, $2, $3, NOW())`,
          [campaignId, ctId, ADMIN_USER_ID]
        );
      }
    }
    await client.query("COMMIT");
    return { id: campaignId, ...result.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listCampaigns() {
  const result = await query(
    `SELECT c."Id" as id, c."Name" as name, c."Description" as description,
            c."Type" as type, c."Status" as status, c."CreatedOn" as "createdOn"
     FROM "Campaign" c
     WHERE c."DeletedOn" IS NULL
     ORDER BY c."CreatedOn" DESC`
  );
  return result.rows;
}
