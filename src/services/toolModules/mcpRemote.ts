import type { McpServerConfig, McpToolConfig, McpToolSnapshot } from '../../stores/settings';
import { callMcpTool, formatMcpCallResult } from '../mcpHttpClient';
import { ToolDefinition, ToolModule } from './types';

const MCP_TOOL_PREFIX = 'mcp__';

export const mcpRemoteTool: ToolModule = {
  id: 'mcp-remote',
  labels: {},
  getDefinitions: (config) => getMcpToolDefinitions(config.mcpTools),
  execute: async (toolName, args, context) => {
    const resolved = resolveMcpToolName(toolName, context.mcpToolConfig);
    if (!resolved) return undefined;

    const result = await callMcpTool(
      {
        url: resolved.server.url,
        authorization: resolved.server.authorization,
      },
      resolved.tool.name,
      args
    );
    return formatMcpCallResult(result);
  },
};

export function makeMcpToolName(serverId: string, toolName: string): string {
  return `${MCP_TOOL_PREFIX}${sanitizeToolNamePart(serverId)}__${sanitizeToolNamePart(toolName)}`;
}

export function sanitizeMcpServerId(value: string): string {
  const sanitized = sanitizeToolNamePart(value);
  return sanitized || `server_${Date.now().toString(36)}`;
}

function getMcpToolDefinitions(config?: McpToolConfig): ToolDefinition[] {
  if (!config?.enabled) return [];

  const definitions: ToolDefinition[] = [];
  for (const server of config.servers || []) {
    if (!server.enabled) continue;
    for (const tool of server.tools || []) {
      if (tool.enabled === false) continue;
      const name = makeMcpToolName(server.id, tool.name);
      definitions.push({
        type: 'function',
        function: {
          name,
          description: buildMcpToolDescription(server, tool),
          parameters: normalizeInputSchema(tool.inputSchema),
        },
      });
    }
  }
  return definitions;
}

function resolveMcpToolName(
  toolName: string,
  config?: McpToolConfig
): { server: McpServerConfig; tool: McpToolSnapshot } | null {
  if (!toolName.startsWith(MCP_TOOL_PREFIX) || !config?.enabled) return null;

  for (const server of config.servers || []) {
    if (!server.enabled) continue;
    for (const tool of server.tools || []) {
      if (tool.enabled === false) continue;
      if (makeMcpToolName(server.id, tool.name) === toolName) {
        return { server, tool };
      }
    }
  }
  throw new Error(`Unknown MCP tool: ${toolName}`);
}

function buildMcpToolDescription(server: McpServerConfig, tool: McpToolSnapshot): string {
  const title = tool.title || tool.name;
  const description = tool.description || 'Remote MCP tool.';
  return `[MCP: ${server.name}] ${title}\n${description}`;
}

function normalizeInputSchema(inputSchema: Record<string, any> | undefined): ToolDefinition['function']['parameters'] {
  if (!inputSchema || typeof inputSchema !== 'object') {
    return { type: 'object', properties: {}, required: [] };
  }

  const properties =
    inputSchema.properties && typeof inputSchema.properties === 'object'
      ? inputSchema.properties
      : {};
  const required = Array.isArray(inputSchema.required)
    ? inputSchema.required.filter((item) => typeof item === 'string')
    : [];

  return {
    ...inputSchema,
    type: 'object',
    properties,
    required,
  };
}

function sanitizeToolNamePart(value: string): string {
  const sanitized = String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return sanitized || 'tool';
}
