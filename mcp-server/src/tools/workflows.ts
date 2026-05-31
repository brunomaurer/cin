import { ApiClient } from "../api-client.js";

export async function listWorkflows(api: ApiClient) {
  return api.get("/workflows");
}

export async function createWorkflowType(
  api: ApiClient,
  input: { name: string; contentTypeId: number; stages: string[] }
) {
  return api.post("/workflow-types", input);
}

export async function createWorkflow(
  api: ApiClient,
  input: { name: string; workflowTypeId: number }
) {
  return api.post("/workflows", input);
}
