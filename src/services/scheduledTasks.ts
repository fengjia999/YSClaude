import { fetch as expoFetch } from 'expo/fetch';

export type ScheduledTaskType = 'daily' | 'interval' | 'once';
export type ScheduledTaskResultStatus = 'success' | 'failed' | 'skipped';

export interface ScheduledTaskBackendConfig {
  baseUrl: string;
  apiToken: string;
}

export interface ScheduledTask {
  id: string;
  title: string;
  prompt: string;
  systemPrompt?: string;
  scheduleType: ScheduledTaskType;
  timeOfDay?: string;
  intervalMinutes?: number;
  timezone?: string;
  enabled: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  nextRunAt?: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledTaskResult {
  id: string;
  taskId: string;
  taskTitle: string;
  status: ScheduledTaskResultStatus;
  content: string;
  errorMessage?: string;
  trigger: 'scheduled' | 'manual';
  createdAt: string;
}

export interface ScheduledTaskPushDevice {
  id: string;
  token: string;
  platform?: string;
  label?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertScheduledTaskInput {
  title: string;
  prompt: string;
  systemPrompt?: string;
  scheduleType: ScheduledTaskType;
  timeOfDay?: string;
  intervalMinutes?: number;
  timezone?: string;
  enabled?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  nextRunAt?: string;
}

class ScheduledTaskApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ScheduledTaskApiError';
  }
}

export async function checkScheduledTaskServer(config: ScheduledTaskBackendConfig): Promise<{ ok: boolean; now: string }> {
  return request(config, '/health', { auth: false });
}

export async function listScheduledTasks(config: ScheduledTaskBackendConfig): Promise<ScheduledTask[]> {
  const data = await request<{ tasks: ScheduledTask[] }>(config, '/api/tasks');
  return data.tasks || [];
}

export async function createScheduledTask(
  config: ScheduledTaskBackendConfig,
  input: UpsertScheduledTaskInput
): Promise<ScheduledTask> {
  const data = await request<{ task: ScheduledTask }>(config, '/api/tasks', {
    method: 'POST',
    body: input,
  });
  return data.task;
}

export async function updateScheduledTask(
  config: ScheduledTaskBackendConfig,
  id: string,
  patch: Partial<UpsertScheduledTaskInput>
): Promise<ScheduledTask> {
  const data = await request<{ task: ScheduledTask }>(config, `/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });
  return data.task;
}

export async function deleteScheduledTask(config: ScheduledTaskBackendConfig, id: string): Promise<void> {
  await request(config, `/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function runScheduledTaskNow(
  config: ScheduledTaskBackendConfig,
  id: string
): Promise<ScheduledTaskResult> {
  const data = await request<{ result: ScheduledTaskResult }>(
    config,
    `/api/tasks/${encodeURIComponent(id)}/run-now`,
    { method: 'POST' }
  );
  return data.result;
}

export async function listScheduledTaskResults(
  config: ScheduledTaskBackendConfig,
  limit = 50
): Promise<ScheduledTaskResult[]> {
  const data = await request<{ results: ScheduledTaskResult[] }>(
    config,
    `/api/results?limit=${encodeURIComponent(String(limit))}`
  );
  return data.results || [];
}

export async function registerScheduledTaskPushDevice(
  config: ScheduledTaskBackendConfig,
  input: { token: string; platform?: string; label?: string }
): Promise<{ device: ScheduledTaskPushDevice; deviceCount: number }> {
  return request(config, '/api/devices/register', {
    method: 'POST',
    body: input,
  });
}

export async function sendScheduledTaskTestPush(
  config: ScheduledTaskBackendConfig
): Promise<{ ok: boolean; sent: number; failed: number }> {
  return request(config, '/api/push/test', { method: 'POST' });
}

async function request<T>(
  config: ScheduledTaskBackendConfig,
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  if (!baseUrl) {
    throw new ScheduledTaskApiError('请先填写后端地址', 0);
  }
  if (options.auth !== false && !config.apiToken.trim()) {
    throw new ScheduledTaskApiError('请先填写访问令牌', 0);
  }

  let response: Response;
  try {
    response = await expoFetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.auth === false ? {} : { Authorization: `Bearer ${config.apiToken.trim()}` }),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error: any) {
    throw new ScheduledTaskApiError(error?.message || '网络连接失败', 0);
  }

  const text = await response.text();
  const data = text ? safeJsonParse(text) : {};
  if (!response.ok) {
    throw new ScheduledTaskApiError(
      data?.message || data?.error || `HTTP ${response.status}`,
      response.status
    );
  }
  return data as T;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, '');
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
