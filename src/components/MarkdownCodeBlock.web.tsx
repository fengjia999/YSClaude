import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy } from 'lucide-react-native';
import { fonts } from '../theme/fonts';
import { useThemeColors, type ThemeColors } from '../theme/colors';

const LONG_CODE_LINE_COUNT = 18;
const LONG_CODE_LENGTH = 1200;

function trimTrailingFenceNewline(content: string): string {
  return content.endsWith('\n') ? content.slice(0, -1) : content;
}

function getLanguageLabel(language?: string): string {
  return (language || '').trim().split(/\s+/)[0]?.toLowerCase() || 'code';
}

function lineCountOf(content: string): number {
  if (!content) return 0;
  return content.split(/\r\n|\r|\n/).length;
}

interface Props {
  content: string;
  language?: string;
  inheritedStyle?: TextStyle;
  codeStyle?: TextStyle;
  containerStyle?: any;
}

export function MarkdownCodeBlock({
  content,
  language,
  inheritedStyle,
  codeStyle,
  containerStyle,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = trimTrailingFenceNewline(content);
  const longCode = lineCountOf(code) > LONG_CODE_LINE_COUNT || code.length > LONG_CODE_LENGTH;
  const visibleCode = longCode && !expanded
    ? code.split(/\r\n|\r|\n/).slice(0, 14).join('\n')
    : code;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.header}>
        <Text style={styles.language} numberOfLines={1}>{getLanguageLabel(language)}</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerButton} onPress={handleCopy}>
            {copied ? (
              <Check size={14} color={colors.primary} strokeWidth={2.2} />
            ) : (
              <Copy size={14} color={colors.textSecondary} strokeWidth={2.2} />
            )}
            <Text style={[styles.headerButtonText, copied && { color: colors.primary }]}>
              {copied ? '已复制' : '复制'}
            </Text>
          </Pressable>
          {longCode && (
            <Pressable style={styles.headerButton} onPress={() => setExpanded((value) => !value)}>
              <Text style={styles.headerButtonText}>{expanded ? '收起' : '展开'}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <ScrollView horizontal style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.codeText, inheritedStyle, codeStyle]}>{visibleCode}</Text>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignSelf: 'stretch',
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: colors.codeBlock,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginVertical: 8,
    },
    header: {
      minHeight: 36,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      gap: 8,
    },
    language: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: fonts.mono,
      textTransform: 'uppercase',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerButton: {
      minHeight: 28,
      paddingHorizontal: 8,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.inputBackground,
    },
    headerButtonText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    scroll: {
      alignSelf: 'stretch',
    },
    scrollContent: {
      padding: 12,
    },
    codeText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.codeText,
      fontFamily: fonts.mono,
      whiteSpace: 'pre' as any,
    },
  });
}
