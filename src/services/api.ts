import { fetch as expoFetch } from 'expo/fetch';
import { ToolDefinition } from './tools';

export interface ChatMessage {
  role: string;
  content: string | any[];
  tool_calls?: any[];
  tool_call_id?: string;
}

interface ChatRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  sessionId?: string;
}

interface ChatRequestWithTools extends ChatRequest {
  tools?: ToolDefinition[];
}

interface ChatCompletionChoice {
  message: {
    role: string;
    content: string | null;
    tool_calls?: {
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }[];
  };
  finish_reason: string;
}

export interface ChatCompletionResponse {
  choices: ChatCompletionChoice[];
}

export interface StreamChatCompletionResult {
  content: string;
  tool_calls?: {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }[];
  finish_reason?: string;
}

type StreamToolCall = NonNullable<StreamChatCompletionResult['tool_calls']>[number];

function createEmptyToolCall(): StreamToolCall {
  return {
    id: '',
    type: 'function',
    function: { name: '', arguments: '' },
  };
}

function resolveToolCallIndex(
  toolCallParts: StreamToolCall[],
  partial: any,
  position: number,
  batchLength: number,
  lastToolCallIndex: number
): number {
  const partialId = typeof partial.id === 'string' ? partial.id : '';
  if (partialId) {
    const existingById = toolCallParts.findIndex((tc) => tc?.id === partialId);
    if (existingById >= 0) return existingById;
  }

  if (typeof partial.index === 'number') {
    const existing = toolCallParts[partial.index];
    if (!existing || !existing.id || !partialId || existing.id === partialId) {
      return partial.index;
    }
    return toolCallParts.length;
  }

  if (batchLength > 1) {
    const existing = toolCallParts[position];
    if (!existing || !existing.id || !partialId || existing.id === partialId) {
      return position;
    }
  }

  return lastToolCallIndex >= 0 ? lastToolCallIndex : toolCallParts.length;
}

function mergeToolName(current: string, incoming: string): string {
  if (!current) return incoming;
  if (incoming === current) return current;
  if (incoming.startsWith(current)) return incoming;
  if (current.startsWith(incoming)) return current;
  return current + incoming;
}

function splitKnownToolNames(name: string, knownToolNames: Set<string>): string[] {
  if (knownToolNames.has(name)) return [name];

  const namesByLength = [...knownToolNames].sort((a, b) => b.length - a.length);
  const result: string[] = [];
  let remaining = name;

  while (remaining) {
    const nextName = namesByLength.find((toolName) => remaining.startsWith(toolName));
    if (!nextName) return [name];
    result.push(nextName);
    remaining = remaining.slice(nextName.length);
  }

  return result.length > 0 ? result : [name];
}

function expandConcatenatedToolNames(
  toolCalls: StreamToolCall[],
  knownToolNames: Set<string>
): StreamToolCall[] {
  const expanded: StreamToolCall[] = [];

  toolCalls.forEach((tc, index) => {
    const names = splitKnownToolNames(tc.function.name, knownToolNames);
    if (names.length <= 1) {
      expanded.push({ ...tc, id: tc.id || `call_${index}` });
      return;
    }

    names.forEach((name, nameIndex) => {
      expanded.push({
        ...tc,
        id: nameIndex === 0 ? tc.id || `call_${index}` : `${tc.id || `call_${index}`}_${nameIndex}`,
        function: {
          name,
          arguments: nameIndex === names.length - 1 ? tc.function.arguments : '{}',
        },
      });
    });
  });

  return expanded;
}

/**
 * 非流式 chat completions（Tool Use 阶段使用）
 */
export async function chatCompletion(
  request: ChatRequestWithTools
): Promise<ChatCompletionResponse> {
  const { baseUrl, apiKey, model, messages, maxTokens, temperature, tools, sessionId } = request;

  const url = `${baseUrl.trim().replace(/\/$/, '')}/chat/completions`;

  const body: Record<string, any> = {
    model,
    messages,
    stream: false,
  };
  if (maxTokens) {
    body.max_tokens = maxTokens;
  }
  if (typeof temperature === 'number') {
    body.temperature = temperature;
  }
  if (tools && tools.length > 0) {
    body.tools = tools;
  }
  if (sessionId) {
    body.session_id = sessionId;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return await response.json();
}

export async function streamChatCompletion(
  request: ChatRequestWithTools,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<StreamChatCompletionResult> {
  const { baseUrl, apiKey, model, messages, maxTokens, temperature, tools, sessionId } = request;

  const url = `${baseUrl.trim().replace(/\/$/, '')}/chat/completions`;

  const body: Record<string, any> = {
    model,
    messages,
    stream: true,
  };
  if (maxTokens) {
    body.max_tokens = maxTokens;
  }
  if (typeof temperature === 'number') {
    body.temperature = temperature;
  }
  if (tools && tools.length > 0) {
    body.tools = tools;
  }
  if (sessionId) {
    body.session_id = sessionId;
  }

  const response = await expoFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let finishReason: string | undefined;
  const toolCallParts: StreamToolCall[] = [];
  const knownToolNames = new Set((tools || []).map((tool) => tool.function.name));
  let lastToolCallIndex = -1;

  const handleJson = (json: any) => {
    const choice = json.choices?.[0];
    if (!choice) return;
    if (choice.finish_reason) {
      finishReason = choice.finish_reason;
    }

    const delta = choice.delta || {};
    if (delta.content) {
      content += delta.content;
      onToken(delta.content);
    }

    if (Array.isArray(delta.tool_calls)) {
      for (let position = 0; position < delta.tool_calls.length; position++) {
        const partial = delta.tool_calls[position];
        let index = resolveToolCallIndex(
          toolCallParts,
          partial,
          position,
          delta.tool_calls.length,
          lastToolCallIndex
        );
        if (!toolCallParts[index]) {
          toolCallParts[index] = createEmptyToolCall();
        }

        let target = toolCallParts[index];
        if (partial.id) target.id = partial.id;
        if (partial.type) target.type = partial.type;
        if (partial.function?.name) {
          const incomingName = partial.function.name;
          if (
            knownToolNames.has(target.function.name) &&
            knownToolNames.has(incomingName) &&
            target.function.name !== incomingName
          ) {
            index = toolCallParts.length;
            toolCallParts[index] = {
              ...createEmptyToolCall(),
              id:
                partial.id && partial.id !== target.id
                  ? partial.id
                  : `${target.id || `call_${index - 1}`}_${index}`,
              type: partial.type || target.type,
            };
            target = toolCallParts[index];
          }
          target.function.name = mergeToolName(target.function.name, incomingName);
        }
        if (partial.function?.arguments) {
          target.function.arguments += partial.function.arguments;
        }
        lastToolCallIndex = index;
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        handleJson(JSON.parse(trimmed.slice(6)));
      } catch {
        // skip malformed JSON
      }
    }
  }

  const toolCalls = expandConcatenatedToolNames(
    toolCallParts.filter((tc) => tc.function.name),
    knownToolNames
  );

  return {
    content,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    finish_reason: finishReason,
  };
}

export async function streamChat(
  request: ChatRequest,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const { baseUrl, apiKey, model, messages, maxTokens, temperature, sessionId } = request;

  const url = `${baseUrl.trim().replace(/\/$/, '')}/chat/completions`;

  const body: Record<string, any> = {
    model,
    messages,
    stream: true,
  };
  if (maxTokens) {
    body.max_tokens = maxTokens;
  }
  if (typeof temperature === 'number') {
    body.temperature = temperature;
  }
  if (sessionId) {
    body.session_id = sessionId;
  }

  const response = await expoFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          onToken(delta);
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
}
