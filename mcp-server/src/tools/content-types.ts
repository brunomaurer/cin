import { ApiClient } from "../api-client.js";

export async function listContentTypes(api: ApiClient) {
  return api.get("/content-types");
}

export async function createContentType(
  api: ApiClient,
  input: {
    name: string;
    description?: string;
    widgets?: Array<{
      name: string;
      fieldType: number;
      required?: boolean;
      description?: string;
      options?: string[];
    }>;
  }
) {
  return api.post("/content-types", input);
}
