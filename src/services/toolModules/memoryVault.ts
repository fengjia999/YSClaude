import { MemoryVaultConfig } from '../../stores/settings';
import { ToolDefinition, ToolModule } from './types';

const MEMORY_SEARCH_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_memory_vault',
    description:
      '语义搜索记忆库。当用户提到过去的经历、回忆、或你需要回忆与用户相关的信息时使用。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词或语义查询',
        },
      },
      required: ['query'],
    },
  },
};

const DIARY_QUERY_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'query_diary',
    description:
      '查询指定日期的日记内容。当用户询问某一天发生了什么、或需要查看特定日期的记录时使用。',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: '日期，格式为 YYYY-MM-DD',
        },
      },
      required: ['date'],
    },
  },
};

export const memoryVaultTool: ToolModule = {
  id: 'memory-vault',
  labels: {
    search_memory_vault: '搜索记忆库',
    query_diary: '查询日记',
  },
  getDefinitions: (config) =>
    config.memoryVault ? [MEMORY_SEARCH_TOOL, DIARY_QUERY_TOOL] : [],
  execute: async (toolName, args, context) => {
    switch (toolName) {
      case 'search_memory_vault':
        return await executeMemorySearch(args.query, context.memoryVaultConfig);
      case 'query_diary':
        return await executeDiaryQuery(args.date, context.memoryVaultConfig);
      default:
        return undefined;
    }
  },
};

async function executeMemorySearch(
  query: string,
  config: MemoryVaultConfig
): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const params = new URLSearchParams({
    query,
    top_k: String(config.topK),
    token_budget: String(config.tokenBudget),
  });

  const resp = await fetch(`${baseUrl}/api/search?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!resp.ok) {
    throw new Error(`记忆库搜索失败: HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const items = data.items || [];
  if (items.length === 0) {
    return '未找到相关记忆。';
  }

  const lines: string[] = [`找到 ${items.length} 条相关记忆：\n`];
  for (const item of items) {
    const date = item.date || '未知日期';
    const content = item.original || item.summary || '';
    const tags = Array.isArray(item.tags) && item.tags.length > 0 ? ` #${item.tags.join(' #')}` : '';
    const score = item.score != null ? ` (相关度: ${(item.score * 100).toFixed(0)}%)` : '';
    lines.push(`【${date}】${score}${tags}\n${content}\n`);
  }
  return lines.join('\n');
}

async function executeDiaryQuery(
  date: string,
  config: MemoryVaultConfig
): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/$/, '');

  const resp = await fetch(`${baseUrl}/api/diary/${date}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!resp.ok) {
    if (resp.status === 404) {
      return `未找到 ${date} 的日记。`;
    }
    throw new Error(`日记查询失败: HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const content =
    data.content || data.text || data.diary || data.body || JSON.stringify(data);
  return `【${date} 的日记】\n${content}`;
}

export async function uploadDiary(
  date: string,
  content: string,
  config: MemoryVaultConfig
): Promise<void> {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  if (!baseUrl) {
    throw new Error('未配置记忆库地址');
  }
  if (!config.adminToken) {
    throw new Error('未配置管理员 Token，请在「Tool 设置」中填写');
  }

  const resp = await fetch(`${baseUrl}/api/diary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.adminToken}`,
    },
    body: JSON.stringify({ date, content }),
  });

  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      throw new Error('认证失败：管理员 Token 不正确');
    }
    const text = await resp.text().catch(() => '');
    throw new Error(`上传失败: HTTP ${resp.status}${text ? ` - ${text.slice(0, 200)}` : ''}`);
  }
}
