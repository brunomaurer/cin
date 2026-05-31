import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initCrypto } from "./crypto.js";
import { listContentTypes, createContentType } from "./tools/content-types.js";
import {
  listContentItems,
  getContentDetails,
  createContentItem,
  updateContentItem,
} from "./tools/content-items.js";
import { createRelations, listRelations } from "./tools/relations.js";
import { createCampaign, listCampaigns } from "./tools/campaigns.js";
import { createWorkflowType, createWorkflow, listWorkflows } from "./tools/workflows.js";

initCrypto(process.env.ENCRYPTION_KEY || "");

const server = new McpServer({
  name: "cin-trendradar",
  version: "0.1.0",
});

// ── Content Types ─────────────────────────────────────────────────────────────

server.tool("list_content_types", "List all content types", {}, async () => {
  const result = await listContentTypes();
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
    const result = await createContentType(args);
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
    const result = await listContentItems(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_content_details",
  "Get full details of a content item including widget values",
  {
    contentId: z.number(),
  },
  async (args) => {
    const result = await getContentDetails(args.contentId);
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
    const input = {
      ...args,
      widgets: args.widgets
        ? Object.fromEntries(
            Object.entries(args.widgets).map(([k, v]) => [parseInt(k), v])
          )
        : undefined,
    };
    const result = await createContentItem(input);
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
    const input = {
      ...args,
      widgets: args.widgets
        ? Object.fromEntries(
            Object.entries(args.widgets).map(([k, v]) => [parseInt(k), v])
          )
        : undefined,
    };
    await updateContentItem(input);
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
    const result = await createRelations(args.relations);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "list_relations",
  "List all relations for a content item",
  {
    contentId: z.number(),
  },
  async (args) => {
    const result = await listRelations(args.contentId);
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
    const result = await createCampaign(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool("list_campaigns", "List all campaigns", {}, async () => {
  const result = await listCampaigns();
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
    const result = await createWorkflowType(args);
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
    const result = await createWorkflow(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool("list_workflows", "List all workflows", {}, async () => {
  const result = await listWorkflows();
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

// ── Start server ──────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CIN MCP Server running on stdio — 13 tools registered");
}

main().catch(console.error);
