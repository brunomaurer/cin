import { query, getClient } from "../db.js";

const ADMIN_USER_ID = 1000000000;

interface CreateRelationInput {
  leftContentId: number;
  rightContentId: number;
  notes?: string;
}

export async function createRelations(relations: CreateRelationInput[]) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const results: any[] = [];
    for (const rel of relations) {
      const result = await client.query(
        `INSERT INTO "Relation" ("LeftContentId", "RightContentId", "Note", "CreatedUserId", "CreatedOn")
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING "Id", "LeftContentId", "RightContentId", "Note"`,
        [rel.leftContentId, rel.rightContentId, rel.notes || null, ADMIN_USER_ID]
      );
      if (result.rows.length > 0) results.push(result.rows[0]);
    }
    await client.query("COMMIT");
    return results;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listRelations(contentId: number) {
  const result = await query(
    `SELECT r."Id" as id,
            r."LeftContentId" as "leftContentId", lc."Name" as "leftName",
            r."RightContentId" as "rightContentId", rc."Name" as "rightName",
            r."Note" as notes, r."CreatedOn" as "createdOn"
     FROM "Relation" r
     JOIN "Content" lc ON r."LeftContentId" = lc."Id"
     JOIN "Content" rc ON r."RightContentId" = rc."Id"
     WHERE (r."LeftContentId" = $1 OR r."RightContentId" = $1)
       AND r."DeletedOn" IS NULL
     ORDER BY r."CreatedOn" DESC`,
    [contentId]
  );
  return result.rows;
}
