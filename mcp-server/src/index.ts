import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createApiClient } from "./api-client.js";
import { listContentTypes, createContentType } from "./tools/content-types.js";
import { listContentItems, getContentDetails, createContentItem, updateContentItem } from "./tools/content-items.js";
import { createRelations, listRelations } from "./tools/relations.js";
import { createCampaign, listCampaigns } from "./tools/campaigns.js";
import { createWorkflowType, createWorkflow, listWorkflows } from "./tools/workflows.js";

const API_URL = process.env.API_URL || "http://localhost:3000";
const TENANT_TOKEN = process.env.TENANT_TOKEN || "";

if (!TENANT_TOKEN) {
  console.error("ERROR: TENANT_TOKEN environment variable is required");
  process.exit(1);
}

const api = createApiClient(API_URL, TENANT_TOKEN);

const server = new McpServer({
  name: "cin-trendradar",
  version: "0.2.0",
});

// ── Content Types ─────────────────────────────────────────────────────────────

server.tool("list_content_types", "List all content types", {}, async () => {
  const result = await listContentTypes(api);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.tool(
  "create_content_type",
  "Create a new content type with optional widgets",
  {
    name: z.string(),
    description: z.string().optional(),
    widgets: z
      .array(
        z.object({
          name: z.string(),
          fieldType: z.number(),
          required: z.boolean().optional(),
          description: z.string().optional(),
          options: z.array(z.string()).optional(),
        })
      )
      .optional(),
  },
  async (args) => {
    const result = await createContentType(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Content Items ─────────────────────────────────────────────────────────────

server.tool(
  "list_content_items",
  "List content items with optional filters",
  {
    contentTypeId: z.number().optional(),
    search: z.string().optional(),
    pageSize: z.number().optional(),
    page: z.number().optional(),
  },
  async (args) => {
    const result = await listContentItems(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_content_details",
  "Get full details of a content item including widget values",
  { contentId: z.number() },
  async (args) => {
    const result = await getContentDetails(api, args.contentId);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

const widgetValueSchema = z
  .record(
    z.string(),
    z.object({
      textValue: z.string().optional(),
      intValue: z.number().optional(),
      dateValue: z.string().optional(),
      decimalValue: z.number().optional(),
    })
  )
  .optional();

server.tool(
  "create_content_item",
  "Create a new content item",
  {
    contentTypeId: z.number(),
    name: z.string(),
    abstract: z.string().optional(),
    widgets: widgetValueSchema,
  },
  async (args) => {
    const result = await createContentItem(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "update_content_item",
  "Update an existing content item",
  {
    id: z.number(),
    name: z.string().optional(),
    abstract: z.string().optional(),
    status: z.number().optional(),
    widgets: widgetValueSchema,
  },
  async (args) => {
    const { id, ...rest } = args;
    await updateContentItem(api, id, rest);
    return { content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }] };
  }
);

// ── Relations ─────────────────────────────────────────────────────────────────

server.tool(
  "create_relations",
  "Create one or more relations between content items",
  {
    relations: z.array(
      z.object({
        leftContentId: z.number(),
        rightContentId: z.number(),
        notes: z.string().optional(),
      })
    ),
  },
  async (args) => {
    const result = await createRelations(api, args.relations);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "list_relations",
  "List all relations for a content item",
  { contentId: z.number() },
  async (args) => {
    const result = await listRelations(api, args.contentId);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Campaigns ─────────────────────────────────────────────────────────────────

server.tool(
  "create_campaign",
  "Create a new campaign",
  {
    name: z.string(),
    description: z.string().optional(),
    type: z.number(),
    contentTypeIds: z.array(z.number()).optional(),
  },
  async (args) => {
    const result = await createCampaign(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool("list_campaigns", "List all campaigns", {}, async () => {
  const result = await listCampaigns(api);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

// ── Workflows ─────────────────────────────────────────────────────────────────

server.tool(
  "create_workflow_type",
  "Create a new workflow type with stages",
  {
    name: z.string(),
    contentTypeId: z.number(),
    stages: z.array(z.string()),
  },
  async (args) => {
    const result = await createWorkflowType(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "create_workflow",
  "Create a new workflow instance",
  {
    name: z.string(),
    workflowTypeId: z.number(),
  },
  async (args) => {
    const result = await createWorkflow(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool("list_workflows", "List all workflows", {}, async () => {
  const result = await listWorkflows(api);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

// ── Start server ──────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CIN MCP Server running on stdio — 13 tools registered (via API)");
}

main().catch(console.error);
