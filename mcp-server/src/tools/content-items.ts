import { ApiClient } from "../api-client.js";

export async function listContentItems(
  api: ApiClient,
  input: { contentTypeId?: number; search?: string; pageSize?: number; page?: number } = {}
) {
  const params = new URLSearchParams();
  if (input.contentTypeId) params.set("contentTypeId", String(input.contentTypeId));
  if (input.search) params.set("search", input.search);
  if (input.pageSize) params.set("pageSize", String(input.pageSize));
  if (input.page) params.set("page", String(input.page));
  const qs = params.toString();
  return api.get(`/content-items${qs ? `?${qs}` : ""}`);
}

export async function getContentDetails(api: ApiClient, contentId: number) {
  return api.get(`/content-items/${contentId}`);
}

export async function createContentItem(
  api: ApiClient,
  input: { contentTypeId: number; name: string; abstract?: string; widgets?: Record<string, any> }
) {
  return api.post("/content-items", input);
}

export async function updateContentItem(
  api: ApiClient,
  id: number,
  input: { name?: string; abstract?: string; status?: number; widgets?: Record<string, any> }
) {
  return api.put(`/content-items/${id}`, input);
}
