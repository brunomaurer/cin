import { query, getClient } from "../db.js";
import { WidgetTypeEnum } from "../helpers/enums.js";

interface WidgetInput {
  name: string;
  fieldType: number;
  required?: boolean;
  description?: string;
  options?: string[];
}

interface CreateContentTypeInput {
  name: string;
  description?: string;
  widgets?: WidgetInput[];
}

const ADMIN_USER_ID = 1000000000;

export async function listContentTypes() {
  const result = await query(`
    SELECT ct."Id" as id, ct."Name" as name, ct."Description" as description,
           ct."Published" as published, ct."DisplayOrder" as "displayOrder",
           (SELECT COUNT(*) FROM "Content" c WHERE c."ContentTypeId" = ct."Id" AND c."DeletedOn" IS NULL) as "contentCount",
           (SELECT COUNT(*) FROM "WidgetContentTypeMappings" wm WHERE wm."ContentTypeId" = ct."Id" AND wm."DeletedOn" IS NULL) as "widgetCount"
    FROM "ContentType" ct
    WHERE ct."DeletedOn" IS NULL
    ORDER BY ct."DisplayOrder", ct."Id"
  `);
  return result.rows;
}

export async function createContentType(input: CreateContentTypeInput) {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const ctResult = await client.query(
      `INSERT INTO "ContentType" ("CreatedUserId", "CreatedOn", "Name", "Description", "Published", "DisplayOrder")
       VALUES ($1, NOW(), $2, $3, true, (SELECT COALESCE(MAX("DisplayOrder"), 0) + 1 FROM "ContentType"))
       RETURNING "Id", "Name", "Description"`,
      [ADMIN_USER_ID, input.name, input.description || null]
    );
    const contentTypeId = ctResult.rows[0].Id;

    const widgets: any[] = [];
    for (let i = 0; i < (input.widgets || []).length; i++) {
      const w = input.widgets![i];

      const wtResult = await client.query(
        `INSERT INTO "WidgetType" ("CreatedUserId", "CreatedOn", "Name", "FieldType", "Required", "IsActive", "Description")
         VALUES ($1, NOW(), $2, $3, $4, true, $5)
         RETURNING "Id"`,
        [ADMIN_USER_ID, w.name, w.fieldType, w.required || false, w.description || null]
      );
      const widgetTypeId = wtResult.rows[0].Id;

      let options: any[] = [];
      if (w.options && (w.fieldType === WidgetTypeEnum.DropdownList || w.fieldType === WidgetTypeEnum.MultipleSelectionDropdownList)) {
        for (let j = 0; j < w.options.length; j++) {
          const optResult = await client.query(
            `INSERT INTO "WidgetTypeOption" ("WidgetTypeId", "Key", "Name", "Ordinal")
             VALUES ($1, $2, $3, $4)
             RETURNING "Id", "Key", "Name"`,
            [widgetTypeId, j + 1, w.options[j], j + 1]
          );
          options.push(optResult.rows[0]);
        }
      }

      const mapResult = await client.query(
        `INSERT INTO "WidgetContentTypeMappings" ("ContentTypeId", "FieldTypeId", "ColumnNumber", "Ordinal")
         VALUES ($1, $2, 1, $3)
         RETURNING "Id"`,
        [contentTypeId, widgetTypeId, i + 1]
      );

      widgets.push({
        id: widgetTypeId,
        mappingId: mapResult.rows[0].Id,
        name: w.name,
        fieldType: w.fieldType,
        required: w.required || false,
        options,
      });
    }

    await client.query(
      `INSERT INTO "UserContentType" ("UserId", "ContentTypeId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [ADMIN_USER_ID, contentTypeId]
    );
    await client.query(
      `INSERT INTO "UserRoles" ("UserId", "RoleId", "ContentTypeId", "CreatedUserId", "CreatedOn")
       VALUES ($1, (SELECT "Id" FROM "Roles" WHERE "Name" = 'Admin' LIMIT 1), $2, $1, NOW())
       ON CONFLICT ("UserId", "RoleId", "ContentTypeId") DO NOTHING`,
      [ADMIN_USER_ID, contentTypeId]
    );

    await client.query("COMMIT");

    return {
      id: contentTypeId,
      name: input.name,
      description: input.description || null,
      widgets,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
