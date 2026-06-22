import type { RunCommandConfig } from '../../stores/settings';
import { ToolDefinition, ToolModule } from './types';

const DEFAULT_TIMEOUT_MS = 30000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 300000;
const DEFAULT_MAX_OUTPUT_CHARS = 12000;
const MAX_COMMAND_CHARS = 8000;

const RUN_COMMAND_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'run_command',
    description:
      '在用户配置的远程服务器上执行 shell 命令。只在用户明确要求操作远程服务器、检查服务、查看日志、部署或运行命令时使用。执行会影响真实服务器；删除、覆盖、关机、重启、改权限、安装软件、发布上线等高风险操作必须先得到用户明确指示。',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '要在远程服务器 shell 中执行的完整命令。',
        },
        cwd: {
          type: 'string',
          description: '可选工作目录。省略时使用 Tool 设置中的默认工作目录，或由服务器端决定。',
        },
        timeout_ms: {
          type: 'number',
          description: '可选超时时间，单位毫秒。默认使用 Tool 设置中的超时时间。',
        },
      },
      required: ['command'],
    },
  },
};

export const runCommandTool: ToolModule = {
  id: 'run-command',
  labels: {
    run_command: '远程命令',
  },
  getDefinitions: (config) => (config.runCommand?.enabled ? [RUN_COMMAND_TOOL] : []),
  execute: async (toolName, args, context) => {
    if (toolName !== 'run_command') return undefined;
    return await executeRunCommand(args, context.runCommandConfig);
  },
};

async function executeRunCommand(args: Record<string, any>, config: RunCommandConfig): Promise<string> {
  if (!config?.enabled) {
    throw new Error('远程命令工具未启用，请先在「Tool 设置」中打开');
  }

  const endpointUrl = String(config.endpointUrl || '').trim();
  if (!/^https?:\/\//i.test(endpointUrl)) {
    throw new Error('远程命令服务地址必须以 http:// 或 https:// 开头');
  }

  const command = String(args?.command || '').trim();
  if (!command) {
    throw new Error('command 不能为空');
  }
  if (command.length > MAX_COMMAND_CHARS) {
    throw new Error(`command 过长，最多 ${MAX_COMMAND_CHARS} 个字符`);
  }

  const timeoutMs = normalizeTimeoutMs(args?.timeout_ms, config.timeoutMs);
  const maxOutputChars = normalizeMaxOutputChars(config.maxOutputChars);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs + 1000);

  try {
    const resp = await fetch(endpointUrl.replace(/\/$/, ''), {
      method: 'POST',
      headers: buildHeaders(config),
      body: JSON.stringify({
        command,
        cwd: typeof args?.cwd === 'string' && args.cwd.trim() ? args.cwd.trim() : config.defaultCwd || undefined,
        timeout_ms: timeoutMs,
      }),
      signal: controller.signal,
    });

    const text = await resp.text();
    if (!resp.ok) {
      throw new Error(`远程命令服务失败: HTTP ${resp.status} - ${text.slice(0, 500)}`);
    }

    return formatRunCommandResponse(text, maxOutputChars);
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`远程命令执行超时: ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildHeaders(config: RunCommandConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = String(config.accessToken || '').trim();
  if (token) {
    headers.Authorization = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  }
  return headers;
}

function normalizeTimeoutMs(input: unknown, fallback: number): number {
  const value = typeof input === 'number' ? input : fallback;
  if (!Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.round(value)));
}

function normalizeMaxOutputChars(input: number): number {
  if (!Number.isFinite(input) || input <= 0) return DEFAULT_MAX_OUTPUT_CHARS;
  return Math.min(100000, Math.max(1000, Math.round(input)));
}

function formatRunCommandResponse(text: string, maxOutputChars: number): string {
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    return truncateOutput(text || '命令已执行，服务未返回输出。', maxOutputChars);
  }

  const exitCode = data?.exit_code ?? data?.exitCode ?? data?.code;
  const stdout = normalizeOutput(data?.stdout ?? data?.output);
  const stderr = normalizeOutput(data?.stderr ?? data?.error);
  const signal = normalizeOutput(data?.signal);
  const timedOut = data?.timed_out ?? data?.timedOut;
  const durationMs = data?.duration_ms ?? data?.durationMs;

  const lines = [
    '远程命令执行结果：',
    typeof exitCode !== 'undefined' ? `exit_code: ${String(exitCode)}` : '',
    typeof timedOut !== 'undefined' ? `timed_out: ${String(!!timedOut)}` : '',
    typeof durationMs !== 'undefined' ? `duration_ms: ${String(durationMs)}` : '',
    signal ? `signal: ${signal}` : '',
    stdout ? `\n[stdout]\n${stdout}` : '',
    stderr ? `\n[stderr]\n${stderr}` : '',
  ].filter(Boolean);

  return truncateOutput(lines.join('\n') || '命令已执行，服务未返回输出。', maxOutputChars);
}

function normalizeOutput(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || typeof value === 'undefined') return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function truncateOutput(output: string, maxOutputChars: number): string {
  if (output.length <= maxOutputChars) return output;
  const omitted = output.length - maxOutputChars;
  return `${output.slice(0, maxOutputChars)}\n\n[输出已截断，省略 ${omitted} 个字符]`;
}
