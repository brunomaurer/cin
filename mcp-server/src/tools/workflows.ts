import { query, getClient } from "../db.js";

const ADMIN_USER_ID = 1000000000;

interface CreateWorkflowTypeInput {
  name: string;
  contentTypeId: number;
  stages: string[];
}

interface CreateWorkflowInput {
  name: string;
  workflowTypeId: number;
}

export async function createWorkflowType(input: CreateWorkflowTypeInput) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO "WorkflowTypes" ("Name", "CreatedUserId", "CreatedOn")
       VALUES ($1, $2, NOW())
       RETURNING "Id", "Name"`,
      [input.name, ADMIN_USER_ID]
    );
    const workflowTypeId = result.rows[0].Id;
    const stages: any[] = [];
    for (let i = 0; i < input.stages.length; i++) {
      const stageResult = await client.query(
        `INSERT INTO "Stages" ("Name", "WorkflowTypeId", "ContentTypeId", "Ordinal", "CreatedUserId", "CreatedOn")
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING "Id", "Name", "Ordinal"`,
        [input.stages[i], workflowTypeId, input.contentTypeId, i + 1, ADMIN_USER_ID]
      );
      stages.push(stageResult.rows[0]);
    }
    await client.query("COMMIT");
    return { id: workflowTypeId, name: input.name, stages };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function createWorkflow(input: CreateWorkflowInput) {
  const result = await query(
    `INSERT INTO "Workflows" ("Name", "WorkflowTypeId", "CreatedUserId", "CreatedOn")
     VALUES ($1, $2, $3, NOW())
     RETURNING "Id", "Name", "WorkflowTypeId"`,
    [input.name, input.workflowTypeId, ADMIN_USER_ID]
  );
  return result.rows[0];
}

export async function listWorkflows() {
  const result = await query(
    `SELECT w."Id" as id, w."Name" as name,
            wt."Name" as "workflowTypeName", wt."Id" as "workflowTypeId",
            w."CreatedOn" as "createdOn"
     FROM "Workflows" w
     JOIN "WorkflowTypes" wt ON w."WorkflowTypeId" = wt."Id"
     WHERE w."DeletedOn" IS NULL
     ORDER BY w."CreatedOn" DESC`
  );
  return result.rows;
}
