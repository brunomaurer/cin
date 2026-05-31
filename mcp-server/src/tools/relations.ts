import { ApiClient } from "../api-client.js";

export async function listRelations(api: ApiClient, contentId: number) {
  return api.get(`/relations/${contentId}`);
}

export async function createRelations(
  api: ApiClient,
  relations: Array<{ leftContentId: number; rightContentId: number; notes?: string }>
) {
  return api.post("/relations", { relations });
}
