import { describe, it, expect } from "vitest";
import { createApiClient } from "../src/api-client.js";

describe("API Client", () => {
  it("should create a client with correct methods", () => {
    const client = createApiClient("http://localhost:3000", "test-token");
    expect(client).toBeDefined();
    expect(client.get).toBeDefined();
    expect(client.post).toBeDefined();
    expect(client.put).toBeDefined();
    expect(client.del).toBeDefined();
  });
});
