import { describe, it, expect, afterAll } from "vitest";
import { query, disconnect } from "../src/db.js";
import { createWorkflowType, createWorkflow, listWorkflows } from "../src/tools/workflows.js";

describe("Workflows", () => {
  let workflowTypeId: number;
  let workflowId: number;
  afterAll(async () => {
    if (workflowId) await query(`DELETE FROM "Workflows" WHERE "Id" = $1`, [workflowId]);
    if (workflowTypeId) {
      await query(`DELETE FROM "Stages" WHERE "WorkflowTypeId" = $1`, [workflowTypeId]);
      await query(`DELETE FROM "WorkflowTypes" WHERE "Id" = $1`, [workflowTypeId]);
    }
    await disconnect();
  });

  it("should create a workflow type with stages", async () => {
    const result = await createWorkflowType({
      name: "TEST Innovation Pipeline",
      contentTypeId: 2,
      stages: ["Scouting", "Evaluation", "Pilot", "Scale"],
    });
    workflowTypeId = result.id;
    expect(result.id).toBeGreaterThan(0);
    expect(result.stages.length).toBe(4);
  });

  it("should create a workflow from a type", async () => {
    const result = await createWorkflow({
      name: "TEST Q3 2026 Pipeline",
      workflowTypeId,
    });
    workflowId = result.Id;
    expect(result.Id).toBeGreaterThan(0);
  });

  it("should list workflows", async () => {
    const result = await listWorkflows();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
