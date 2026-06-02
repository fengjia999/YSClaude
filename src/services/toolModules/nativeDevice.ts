import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  openUsageAccessSettings,
  readAppUsageStats,
  readBatteryStatus,
  readDeviceInfo,
  updateCalendarEvent,
} from '../nativeTools';
import { ToolDefinition, ToolModule } from './types';

const DEVICE_INFO_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'read_device_info',
    description: '读取当前用户设备的基础信息，例如品牌、型号、系统版本、设备类型、内存和运行时长。',
    parameters: { type: 'object', properties: {}, required: [] },
  },
};

const BATTERY_STATUS_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'read_battery_status',
    description: '读取当前设备电池状态，例如电量、充电状态、低电量模式和 Android 电池优化状态。',
    parameters: { type: 'object', properties: {}, required: [] },
  },
};

const APP_USAGE_STATS_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'read_app_usage_stats',
    description: '读取 Android 应用使用时间统计。首次使用若未授权，会返回 permissionGranted=false，并提示用户去系统“使用情况访问权限”中授权 YSClaude。',
    parameters: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: '开始时间，ISO 8601 字符串，可选，默认结束时间前 24 小时' },
        end_date: { type: 'string', description: '结束时间，ISO 8601 字符串，可选，默认当前时间' },
        limit: { type: 'number', description: '最多返回多少个应用，可选，默认 20' },
      },
      required: [],
    },
  },
};

const OPEN_USAGE_ACCESS_SETTINGS_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'open_usage_access_settings',
    description: '打开 Android 使用情况访问权限设置页。仅当 read_app_usage_stats 返回 permissionGranted=false 且用户需要授权时调用。',
    parameters: { type: 'object', properties: {}, required: [] },
  },
};

const CALENDAR_LIST_EVENTS_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'calendar_list_events',
    description: '读取设备日历中指定时间范围内的日程。参数必须用字符串，不要用 Date 对象。若用户说“今天/明天/本周”，请先换算成 ISO 8601 时间字符串。需要系统日历权限。',
    parameters: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: '开始时间，ISO 8601 字符串，例如 2026-06-01T00:00:00+08:00。可省略，默认当前时间。' },
        end_date: { type: 'string', description: '结束时间，ISO 8601 字符串，例如 2026-06-07T23:59:59+08:00。可省略，默认开始时间后 24 小时。' },
        calendar_ids: { type: 'array', items: { type: 'string' }, description: '可选，限定要读取的日历 ID 列表' },
      },
      required: [],
    },
  },
};

const CALENDAR_CREATE_EVENT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'calendar_create_event',
    description: '在设备日历中创建日程。参数必须用字符串，不要用 Date 对象。start_date 必填；end_date 可省略，默认开始时间后 1 小时。需要系统日历权限。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '日程标题' },
        start_date: { type: 'string', description: '开始时间，ISO 8601 字符串，例如 2026-06-01T14:00:00+08:00' },
        end_date: { type: 'string', description: '结束时间，ISO 8601 字符串，可选；省略时默认开始后 1 小时' },
        all_day: { type: 'boolean', description: '是否全天日程' },
        location: { type: 'string', description: '地点，可选' },
        notes: { type: 'string', description: '备注，可选' },
        time_zone: { type: 'string', description: '时区，可选，例如 Asia/Shanghai' },
        calendar_id: { type: 'string', description: '目标日历 ID，可选，默认使用系统默认日历' },
      },
      required: ['title', 'start_date'],
    },
  },
};

const CALENDAR_UPDATE_EVENT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'calendar_update_event',
    description: '修改设备日历中的已有日程。需要系统日历权限和日程 id。',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '要修改的日程 ID' },
        title: { type: 'string', description: '新标题，可选' },
        start_date: { type: 'string', description: '新开始时间，ISO 8601 字符串，可选' },
        end_date: { type: 'string', description: '新结束时间，ISO 8601 字符串，可选' },
        all_day: { type: 'boolean', description: '是否全天日程，可选' },
        location: { type: 'string', description: '地点，可选' },
        notes: { type: 'string', description: '备注，可选' },
        time_zone: { type: 'string', description: '时区，可选' },
      },
      required: ['id'],
    },
  },
};

const CALENDAR_DELETE_EVENT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'calendar_delete_event',
    description: '删除设备日历中的已有日程。需要系统日历权限和日程 id。',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: '要删除的日程 ID' } },
      required: ['id'],
    },
  },
};

export const nativeDeviceTool: ToolModule = {
  id: 'native-device',
  labels: {
    read_device_info: '读取设备信息',
    read_battery_status: '读取电池状态',
    read_app_usage_stats: '读取应用使用统计',
    open_usage_access_settings: '打开使用统计授权',
    calendar_list_events: '读取日程',
    calendar_create_event: '创建日程',
    calendar_update_event: '修改日程',
    calendar_delete_event: '删除日程',
  },
  getDefinitions: (config) => {
    const tools: ToolDefinition[] = [];
    if (config.nativeTools?.deviceInfoEnabled) {
      tools.push(DEVICE_INFO_TOOL);
    }
    if (config.nativeTools?.batteryStatusEnabled) {
      tools.push(BATTERY_STATUS_TOOL);
    }
    if (config.nativeTools?.appUsageStatsEnabled) {
      tools.push(APP_USAGE_STATS_TOOL, OPEN_USAGE_ACCESS_SETTINGS_TOOL);
    }
    if (config.nativeTools?.calendarEnabled) {
      tools.push(
        CALENDAR_LIST_EVENTS_TOOL,
        CALENDAR_CREATE_EVENT_TOOL,
        CALENDAR_UPDATE_EVENT_TOOL,
        CALENDAR_DELETE_EVENT_TOOL
      );
    }
    return tools;
  },
  execute: async (toolName, args) => {
    switch (toolName) {
      case 'read_device_info':
        return await readDeviceInfo();
      case 'read_battery_status':
        return await readBatteryStatus();
      case 'read_app_usage_stats':
        return await readAppUsageStats(args);
      case 'open_usage_access_settings':
        return await openUsageAccessSettings();
      case 'calendar_list_events':
        return await listCalendarEvents(args);
      case 'calendar_create_event':
        return await createCalendarEvent(args);
      case 'calendar_update_event':
        return await updateCalendarEvent(args);
      case 'calendar_delete_event':
        return await deleteCalendarEvent(args);
      default:
        return undefined;
    }
  },
};
