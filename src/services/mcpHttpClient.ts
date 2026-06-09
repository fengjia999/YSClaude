import type { McpToolSnapshot } from '../stores/settings';

const MCP_PROTOCOL_VERSION = '2025-06-18';
const MCP_TIMEOUT_MS = 20000;

interface McpJsonRpcError {
  code: number;
  message: string;
  data?: any;
}

interface McpJsonRpcResponse<T = any> {
  jsonrpc?: '2.0';
  id?: string | number;
  result?: T;
  error?: McpJsonRpcError;
}

interface McpSession {
  sessionId?: string;
  nextId: number;
}

export interface McpServerConnectionConfig {
  url: string;
  authorization?: string;
}

export interface McpCallResultContent {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
  [key: string]: any;
}

export interface McpCallToolResult {
  content?: McpCallResultContent[];
  isError?: boolean;
  structuredContent?: any;
  [key: string]: any;
}

export async function listMcpTools(config: McpServerConnectionConfig): Promise<McpToolSnapshot[]> {
  const session = await initializeMcpSession(config);
  const result = await sendMcpRequest<{ tools?: any[] }>(config, session, 'tools/list', {});
  return (result.tools || [])
    .map(normalizeMcpTool)
    .filter((tool): tool is McpToolSnapshot => !!tool);
}

export async function callMcpTool(
  config: McpServerConnectionConfig,
  toolName: string,
  args: Record<string, any>
): Promise<McpCallToolResult> {
  const session = await initializeMcpSession(config);
  return await sendMcpRequest<McpCallToolResult>(config, session, 'tools/call', {
    name: toolName,
    arguments: args || {},
  });
}

export function formatMcpCallResult(result: McpCallToolResult): string {
  const lines: string[] = [];
  if (result.isError) {
    lines.push('MCP tool returned an error result.');
  }

  for (const item of result.content || []) {
    if (item.type === 'text') {
      lines.push(String(item.text || ''));
    } else if (item.type === 'image') {
      lines.push(`[image ${item.mimeType || 'unknown'} omitted]`);
    } else if (item.type === 'resource') {
      lines.push(formatJsonForTool(item.resource ?? item));
    } else {
      lines.push(formatJsonForTool(item));
    }
  }

  if (result.structuredContent !== undefined) {
    lines.push(formatJsonForTool(result.structuredContent));
  }

  const text = lines.map((line) => line.trim()).filter(Boolean).join('\n\n');
  return text || formatJsonForTool(result);
}

async function initializeMcpSession(config: McpServerConnectionConfig): Promise<McpSession> {
  const session: McpSession = { nextId: 1 };
  await sendMcpRequest(config, session, 'initialize', {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: {
      name: 'YSClaude',
      version: '1.0.0',
    },
  });
  await sendMcpNotification(config, session, 'notifications/initialized', {});
  return session;
}

async function sendMcpRequest<T>(
  config: McpServerConnectionConfig,
  session: McpSession,
  method: string,
  params: Record<string, any>
): Promise<T> {
  const id = session.nextId++;
  const response = await postMcp(config, session, {
    jsonrpc: '2.0',
    id,
    method,
    params,
  });
  const message = await readMcpJsonRpcResponse<T>(response, id);
  if (message.error) {
    throw new Error(`MCP ${method} failed: ${message.error.message}`);
  }
  if (message.result === undefined) {
    throw new Error(`MCP ${method} returned no result`);
  }
  return message.result;
}

async function sendMcpNotification(
  config: McpServerConnectionConfig,
  session: McpSession,
  method: string,
  params: Record<string, any>
): Promise<void> {
  const response = await postMcp(config, session, {
    jsonrpc: '2.0',
    method,
    params,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`MCP ${method} failed: HTTP ${response.status}${text ? ` - ${text.slice(0, 200)}` : ''}`);
  }
}

async function postMcp(
  config: McpServerConnectionConfig,
  session: McpSession,
  body: Record<string, any>
): Promise<Response> {
  const url = normalizeMcpUrl(config.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MCP_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
    };
    if (config.authorization?.trim()) {
      headers.Authorization = config.authorization.trim();
    }
    if (session.sessionId) {
      headers['Mcp-Session-Id'] = session.sessionId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const nextSessionId = response.headers.get('mcp-session-id');
    if (nextSessionId) {
      session.sessionId = nextSessionId;
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function readMcpJsonRpcResponse<T>(
  response: Response,
  requestId: string | number
): Promise<McpJsonRpcResponse<T>> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MCP HTTP ${response.status}${text ? ` - ${text.slice(0, 300)}` : ''}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    const messages = parseServerSentEvents(text);
    const matched = messages.find((message) => message.id === requestId || message.id === String(requestId));
    if (matched) return matched as McpJsonRpcResponse<T>;
    const firstWithResult = messages.find((message) => message.result !== undefined || message.error);
    if (firstWithResult) return firstWithResult as McpJsonRpcResponse<T>;
    throw new Error('MCP event stream did not include a JSON-RPC response');
  }

  const parsed = parseJsonSafely(text);
  if (!parsed) {
    throw new Error('MCP server returned invalid JSON');
  }
  return parsed as McpJsonRpcResponse<T>;
}

function parseServerSentEvents(text: string): McpJsonRpcResponse[] {
  const events = text.replace(/\r/g, '').split('\n\n');
  const messages: McpJsonRpcResponse[] = [];
  for (const event of events) {
    const dataLines = event
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart());
    if (dataLines.length === 0) continue;
    const parsed = parseJsonSafely(dataLines.join('\n'));
    if (parsed) {
      messages.push(parsed);
    }
  }
  return messages;
}

function normalizeMcpTool(raw: any): McpToolSnapshot | null {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) {
    return null;
  }
  const inputSchema =
    raw.inputSchema && typeof raw.inputSchema === 'object'
      ? raw.inputSchema
      : { type: 'object', properties: {}, required: [] };
  return {
    name: raw.name.trim(),
    title: typeof raw.title === 'string' ? raw.title : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    inputSchema,
    enabled: raw.enabled !== false,
  };
}

function normalizeMcpUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('MCP server URL is invalid');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('MCP server URL must use http or https');
  }
  return parsed.toString();
}

function parseJsonSafely(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatJsonForTool(value: any): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
