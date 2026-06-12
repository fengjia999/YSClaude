import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { lightColors, useThemeColors, type ThemeColors } from '../src/theme/colors';
import { fonts } from '../src/theme/fonts';
import {
  getApiUsageEvents,
  getApiUsageSummary,
  getApiUsageSummaryByFeature,
  getApiUsageSummaryByModel,
} from '../src/db/operations';
import type { ApiUsageEvent, ApiUsageGroupSummary, ApiUsageSummary } from '../src/types';
import { formatFullTime } from '../src/utils/time';

let colors = lightColors;

const EMPTY_SUMMARY: ApiUsageSummary = {
  totalCalls: 0,
  successCalls: 0,
  errorCalls: 0,
  abortedCalls: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  cachedTokens: 0,
  reasoningTokens: 0,
  totalDurationMs: 0,
};

export default function ApiUsageScreen() {
  colors = useThemeColors();
  styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [summary, setSummary] = useState<ApiUsageSummary>(EMPTY_SUMMARY);
  const [featureRows, setFeatureRows] = useState<ApiUsageGroupSummary[]>([]);
  const [modelRows, setModelRows] = useState<ApiUsageGroupSummary[]>([]);
  const [events, setEvents] = useState<ApiUsageEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextFeatureRows, nextModelRows, nextEvents] = await Promise.all([
        getApiUsageSummary(),
        getApiUsageSummaryByFeature(),
        getApiUsageSummaryByModel(),
        getApiUsageEvents(100),
      ]);
      setSummary(nextSummary);
      setFeatureRows(nextFeatureRows);
      setModelRows(nextModelRows);
      setEvents(nextEvents);
    } catch (err: any) {
      setError(err?.message || '无法读取 API 使用日志');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  const header = (
    <View style={styles.contentHeader}>
      <View style={styles.summaryPanel}>
        <View style={styles.summaryGrid}>
          <Metric label="总 tokens" value={formatNumber(summary.totalTokens)} />
          <Metric label="Prompt" value={formatNumber(summary.promptTokens)} />
          <Metric label="Completion" value={formatNumber(summary.completionTokens)} />
          <Metric label="调用次数" value={formatNumber(summary.totalCalls)} />
          <Metric label="缓存 tokens" value={formatNumber(summary.cachedTokens)} />
          <Metric label="推理 tokens" value={formatNumber(summary.reasoningTokens)} />
        </View>
        <Text style={styles.metaLine}>
          成功 {summary.successCalls} · 失败 {summary.errorCalls} · 中断 {summary.abortedCalls} · 总耗时 {formatDuration(summary.totalDurationMs)}
        </Text>
      </View>

      <GroupSection title="按功能汇总" rows={featureRows} />
      <GroupSection title="按模型汇总" rows={modelRows} />
      <Text style={styles.sectionTitle}>最近调用</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>返回</Text>
        </Pressable>
        <Text style={styles.title}>API 使用日志</Text>
        <Pressable style={styles.headerButton} onPress={() => load().catch(() => undefined)} disabled={loading}>
          <Text style={styles.headerButtonText}>{loading ? '...' : '刷新'}</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading && events.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UsageEventRow event={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={styles.emptyText}>还没有 API 调用日志。</Text>}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function GroupSection({ title, rows }: { title: string; rows: ApiUsageGroupSummary[] }) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.groupPanel}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupScroll}>
        {rows.map((row) => (
          <View key={row.key} style={styles.groupCard}>
            <Text style={styles.groupKey} numberOfLines={1}>{formatGroupKey(row.key)}</Text>
            <Text style={styles.groupValue}>{formatNumber(row.totalTokens)}</Text>
            <Text style={styles.groupMeta}>
              {row.totalCalls} 次 · {formatNumber(row.promptTokens)}/{formatNumber(row.completionTokens)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function UsageEventRow({ event }: { event: ApiUsageEvent }) {
  return (
    <View style={styles.eventRow}>
      <View style={styles.eventTop}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {formatGroupKey(event.feature)} · {event.requestKind}
        </Text>
        <Text style={[styles.statusPill, statusStyle(event.status)]}>{formatStatus(event.status)}</Text>
      </View>
      <Text style={styles.modelText} numberOfLines={1}>{event.model || 'unknown model'}</Text>
      <View style={styles.tokenRow}>
        <TokenChip label="total" value={event.totalTokens} />
        <TokenChip label="prompt" value={event.promptTokens} />
        <TokenChip label="completion" value={event.completionTokens} />
        {!!event.cachedTokens && <TokenChip label="cached" value={event.cachedTokens} />}
        {!!event.reasoningTokens && <TokenChip label="reasoning" value={event.reasoningTokens} />}
      </View>
      <Text style={styles.metaLine}>
        {formatFullTime(event.startedAt)} · {event.streaming ? 'stream' : 'non-stream'} · {formatDuration(event.durationMs)}
      </Text>
      {event.conversationId && (
        <Text style={styles.idText} numberOfLines={1}>conversation: {event.conversationId}</Text>
      )}
      {event.messageId && (
        <Text style={styles.idText} numberOfLines={1}>message: {event.messageId}</Text>
      )}
      {event.errorMessage && <Text style={styles.errorInline} numberOfLines={3}>{event.errorMessage}</Text>}
    </View>
  );
}

function TokenChip({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Text style={styles.tokenChip}>
      {label} {value === undefined ? '-' : formatNumber(value)}
    </Text>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${rest}s`;
}

function formatStatus(status: ApiUsageEvent['status']): string {
  if (status === 'error') return '失败';
  if (status === 'aborted') return '中断';
  return '成功';
}

function statusStyle(status: ApiUsageEvent['status']) {
  if (status === 'error') return styles.statusError;
  if (status === 'aborted') return styles.statusAborted;
  return styles.statusSuccess;
}

function formatGroupKey(key: string): string {
  const labels: Record<string, string> = {
    chat: '主聊天',
    reading: '共读',
    radio: 'AI 电台',
    game: '副本',
    unknown: '未分类',
  };
  return labels[key] ?? key;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 76,
    minHeight: 36,
    justifyContent: 'center',
  },
  headerButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  contentHeader: {
    gap: 12,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryPanel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    minWidth: '31%',
    flexGrow: 1,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: 11,
  },
  groupPanel: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  groupScroll: {
    gap: 8,
    paddingRight: 4,
  },
  groupCard: {
    width: 160,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  groupKey: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  groupValue: {
    marginTop: 6,
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  groupMeta: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 11,
  },
  eventRow: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 7,
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  statusPill: {
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '800',
  },
  statusSuccess: {
    backgroundColor: colors.inputBackground,
    color: colors.success,
  },
  statusError: {
    backgroundColor: colors.dangerSurface,
    color: colors.danger,
  },
  statusAborted: {
    backgroundColor: colors.inputBackground,
    color: colors.textTertiary,
  },
  modelText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  tokenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tokenChip: {
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.inputBackground,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  metaLine: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  idText: {
    color: colors.textTertiary,
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  errorText: {
    margin: 16,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.dangerSurface,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  errorInline: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 28,
  },
});

let styles = createStyles(colors);
