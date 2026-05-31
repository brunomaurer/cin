import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "cin-trendradar",
  version: "0.1.0",
});

// Tools will be registered here in subsequent tasks

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CIN MCP Server running on stdio");
}

main().catch(console.error);
