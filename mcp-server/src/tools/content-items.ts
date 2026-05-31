import { query, getClient } from "../db.js";
import { ContentStatusEnum } from "../helpers/enums.js";

const ADMIN_USER_ID = 1000000000;

interface WidgetValue {
  textValue?: string;
  intValue?: number;
  dateValue?: string;
  decimalValue?: number;
}

interface CreateContentItemInput {
  contentTypeId: number;
  name: string;
  abstract?: string;
  widgets?: Record<number, WidgetValue>;
}

interface UpdateContentItemInput {
  id: number;
  name?: string;
  abstract?: string;
  status?: number;
  widgets?: Record<number, WidgetValue>;
}

interface ListContentItemsInput {
  contentTypeId?: number;
  pageSize?: number;
  page?: number;
  search?: string;
}

export async function createContentItem(input: CreateContentItemInput) {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO "Content" ("CreatedUserId", "CreatedOn", "Name", "Abstract", "Published", "ContentTypeId", "Status")
       VALUES ($1, NOW(), $2, $3, true, $4, $5)
       RETURNING "Id", "Name", "UId", "Status"`,
      [ADMIN_USER_ID, input.name, input.abstract || null, input.contentTypeId, ContentStatusEnum.Published]
    );
    const contentId = result.rows[0].Id;
    const uid = result.rows[0].UId;

    if (input.widgets) {
      for (const [mappingIdStr, value] of Object.entries(input.widgets)) {
        const mappingId = parseInt(mappingIdStr);
        await client.query(
          `INSERT INTO "WidgetValues" ("ContentTypeFieldId", "ContentId", "TextValue", "IntValue", "DateValue", "DecimalValue")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            mappingId,
            contentId,
            value.textValue || null,
            value.intValue ?? null,
            value.dateValue ? new Date(value.dateValue) : null,
            value.decimalValue ?? null,
          ]
        );
      }
    }

    await client.query("COMMIT");
    return { id: contentId, name: input.name, uid, status: ContentStatusEnum.Published };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listContentItems(input: ListContentItemsInput = {}) {
  const conditions: string[] = [`c."DeletedOn" IS NULL`];
  const params: any[] = [];
  let paramIdx = 1;

  if (input.contentTypeId) {
    conditions.push(`c."ContentTypeId" = $${paramIdx++}`);
    params.push(input.contentTypeId);
  }
  if (input.search) {
    conditions.push(`(c."Name" ILIKE $${paramIdx} OR c."Abstract" ILIKE $${paramIdx})`);
    params.push(`%${input.search}%`);
    paramIdx++;
  }

  const limit = input.pageSize || 50;
  const offset = ((input.page || 1) - 1) * limit;

  const result = await query(
    `SELECT c."Id" as id, c."Name" as name, c."Abstract" as abstract,
            c."Status" as status, c."UId" as uid,
            ct."Name" as "contentTypeName", c."ContentTypeId" as "contentTypeId",
            c."CreatedOn" as "createdOn"
     FROM "Content" c
     JOIN "ContentType" ct ON c."ContentTypeId" = ct."Id"
     WHERE ${conditions.join(" AND ")}
     ORDER BY c."CreatedOn" DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset]
  );
  return result.rows;
}

export async function getContentDetails(contentId: number) {
  const contentResult = await query(
    `SELECT c."Id" as id, c."Name" as name, c."Abstract" as abstract,
            c."Status" as status, c."UId" as uid,
            c."ContentTypeId" as "contentTypeId",
            ct."Name" as "contentTypeName",
            c."MediaId" as "mediaId",
            c."CreatedOn" as "createdOn"
     FROM "Content" c
     JOIN "ContentType" ct ON c."ContentTypeId" = ct."Id"
     WHERE c."Id" = $1 AND c."DeletedOn" IS NULL`,
    [contentId]
  );

  if (contentResult.rows.length === 0) {
    throw new Error(`Content ${contentId} not found`);
  }

  const widgetResult = await query(
    `SELECT wv."Id" as "valueId", wv."ContentTypeFieldId" as "mappingId",
            wv."TextValue" as "textValue", wv."IntValue" as "intValue",
            wv."DateValue" as "dateValue", wv."DecimalValue" as "decimalValue",
            wt."Name" as "widgetName", wt."FieldType" as "fieldType",
            wm."Ordinal" as ordinal
     FROM "WidgetValues" wv
     JOIN "WidgetContentTypeMappings" wm ON wv."ContentTypeFieldId" = wm."Id"
     JOIN "WidgetType" wt ON wm."FieldTypeId" = wt."Id"
     WHERE wv."ContentId" = $1 AND wv."DeletedOn" IS NULL
     ORDER BY wm."Ordinal"`,
    [contentId]
  );

  return {
    ...contentResult.rows[0],
    widgets: widgetResult.rows,
  };
}

export async function updateContentItem(input: UpdateContentItemInput) {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const updates: string[] = [`"ModifiedUserId" = $1`, `"ModifiedOn" = NOW()`];
    const params: any[] = [ADMIN_USER_ID];
    let idx = 2;

    if (input.name !== undefined) {
      updates.push(`"Name" = $${idx++}`);
      params.push(input.name);
    }
    if (input.abstract !== undefined) {
      updates.push(`"Abstract" = $${idx++}`);
      params.push(input.abstract);
    }
    if (input.status !== undefined) {
      updates.push(`"Status" = $${idx++}`);
      params.push(input.status);
    }

    params.push(input.id);
    await client.query(
      `UPDATE "Content" SET ${updates.join(", ")} WHERE "Id" = $${idx}`,
      params
    );

    if (input.widgets) {
      for (const [mappingIdStr, value] of Object.entries(input.widgets)) {
        const mappingId = parseInt(mappingIdStr);
        const updateResult = await client.query(
          `UPDATE "WidgetValues" SET "TextValue" = $1, "IntValue" = $2, "DateValue" = $3, "DecimalValue" = $4
           WHERE "ContentTypeFieldId" = $5 AND "ContentId" = $6`,
          [
            value.textValue || null,
            value.intValue ?? null,
            value.dateValue ? new Date(value.dateValue) : null,
            value.decimalValue ?? null,
            mappingId,
            input.id,
          ]
        );
        if (updateResult.rowCount === 0) {
          await client.query(
            `INSERT INTO "WidgetValues" ("ContentTypeFieldId", "ContentId", "TextValue", "IntValue", "DateValue", "DecimalValue")
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [mappingId, input.id, value.textValue || null, value.intValue ?? null, value.dateValue ? new Date(value.dateValue) : null, value.decimalValue ?? null]
          );
        }
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
