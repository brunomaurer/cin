import { ApiClient } from "../api-client.js";

export async function listCampaigns(api: ApiClient) {
  return api.get("/campaigns");
}

export async function createCampaign(
  api: ApiClient,
  input: { name: string; description?: string; type: number; contentTypeIds?: number[] }
) {
  return api.post("/campaigns", input);
}
