import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../src/theme/colors';
import { useSettingsStore, NamedAPIConfig, HiddenRange, TTSConfig } from '../src/stores/settings';
import { useChatStore } from '../src/stores/chat';
import { playTTS, stopTTS } from '../src/services/tts';

const TABS = ['API 配置', '对话设置', 'TTS 配置'] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>设置</Text>
        <View style={styles.backButton} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab, i) => (
          <Pressable
            key={tab}
            style={[styles.tab, i === activeTab && styles.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabText, i === activeTab && styles.tabTextActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 0 && <APIConfigTab />}
      {activeTab === 1 && <ChatSettingsTab />}
      {activeTab === 2 && <TTSConfigTab />}
    </View>
  );
}

/* ==================== API 配置 Tab ==================== */

function APIConfigTab() {
  const { _hydrated, apiConfigs, activeConfigIndex, saveAPIConfig, removeAPIConfig, setActiveConfig } = useSettingsStore();

  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [showModels, setShowModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (_hydrated && apiConfigs.length > 0) {
      loadConfig(activeConfigIndex);
    }
  }, [_hydrated]);

  function loadConfig(index: number) {
    const config = apiConfigs[index];
    if (config) {
      setName(config.name);
      setBaseUrl(config.baseUrl);
      setApiKey(config.apiKey);
      setModel(config.model);
    }
  }

  function handleNew() {
    setName(''); setBaseUrl(''); setApiKey(''); setModel(''); setModels([]);
  }

  async function handleFetchModels() {
    if (!baseUrl || !apiKey) {
      Alert.alert('提示', '请先填写 Base URL 和 API Key');
      return;
    }
    setFetching(true);
    try {
      const url = `${baseUrl.trim().replace(/\/$/, '')}/models`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const ids: string[] = (data.data || []).map((m: any) => m.id).sort();
      if (ids.length === 0) {
        Alert.alert('提示', '未获取到模型列表');
      } else {
        setModels(ids);
        setShowModels(true);
      }
    } catch (e: any) {
      Alert.alert('获取失败', e.message);
    } finally {
      setFetching(false);
    }
  }

  async function handleTest() {
    if (!baseUrl || !apiKey || !model) {
      Alert.alert('提示', '请填写完整配置');
      return;
    }
    setTesting(true);
    try {
      const url = `${baseUrl.trim().replace(/\/$/, '')}/chat/completions`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model.trim(),
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text.slice(0, 100)}`);
      }
      Alert.alert('连接成功', 'API 配置有效');
    } catch (e: any) {
      Alert.alert('连接失败', e.message);
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) { Alert.alert('提示', '请输入配置名称'); return; }
    if (!baseUrl.trim() || !apiKey.trim() || !model.trim()) {
      Alert.alert('提示', '请填写完整配置'); return;
    }
    const config: NamedAPIConfig = {
      name: trimmedName, baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim(),
    };
    saveAPIConfig(config);
    const newIndex = useSettingsStore.getState().apiConfigs.findIndex((c) => c.name === trimmedName);
    if (newIndex >= 0) setActiveConfig(newIndex);
    Alert.alert('已保存', `配置「${trimmedName}」已保存`);
  }

  function handleSelectConfig(index: number) {
    setActiveConfig(index);
    loadConfig(index);
  }

  function handleDeleteConfig(index: number) {
    const config = apiConfigs[index];
    Alert.alert('删除配置', `确定删除「${config.name}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: () => {
          removeAPIConfig(index);
          if (apiConfigs.length > 1) loadConfig(0);
          else handleNew();
        },
      },
    ]);
  }

  if (!_hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.content}>
      {apiConfigs.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>已保存配置</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.configList}>
            {apiConfigs.map((c, i) => (
              <Pressable
                key={i}
                style={[styles.configChip, i === activeConfigIndex && styles.configChipActive]}
                onPress={() => handleSelectConfig(i)}
                onLongPress={() => handleDeleteConfig(i)}
              >
                <Text style={[styles.configChipText, i === activeConfigIndex && styles.configChipTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
            <Pressable style={styles.configChip} onPress={handleNew}>
              <Text style={styles.configChipText}>＋ 新建</Text>
            </Pressable>
          </ScrollView>
        </>
      )}

      <Text style={styles.sectionTitle}>API 配置</Text>
      <View style={styles.field}>
        <Text style={styles.label}>配置名称</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName}
          placeholder="例如：Claude 中转" placeholderTextColor={colors.textTertiary} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Base URL</Text>
        <TextInput style={styles.input} value={baseUrl} onChangeText={setBaseUrl}
          placeholder="https://api.openai.com/v1" placeholderTextColor={colors.textTertiary} autoCapitalize="none" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>API Key</Text>
        <TextInput style={styles.input} value={apiKey} onChangeText={setApiKey}
          placeholder="sk-..." placeholderTextColor={colors.textTertiary} secureTextEntry autoCapitalize="none" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Model</Text>
        <View style={styles.modelRow}>
          <TextInput style={[styles.input, { flex: 1 }]} value={model} onChangeText={setModel}
            placeholder="claude-sonnet-4-6" placeholderTextColor={colors.textTertiary} autoCapitalize="none" />
          <Pressable style={styles.fetchButton} onPress={handleFetchModels} disabled={fetching}>
            {fetching ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.fetchButtonText}>拉取</Text>}
          </Pressable>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.testButton} onPress={handleTest} disabled={testing}>
          {testing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.testButtonText}>测试连接</Text>}
        </Pressable>
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存配置</Text>
        </Pressable>
      </View>

      {/* Model picker modal */}
      <Modal visible={showModels} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowModels(false)}>
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>选择模型</Text>
            <FlatList
              data={models}
              keyExtractor={(item) => item}
              style={styles.modelList}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.modelItem, item === model && styles.modelItemActive]}
                  onPress={() => { setModel(item); setShowModels(false); }}
                >
                  <Text style={[styles.modelItemText, item === model && styles.modelItemTextActive]}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

/* ==================== 对话设置 Tab ==================== */

function ChatSettingsTab() {
  const { hiddenRanges, maxOutputTokens, systemPrompt, setSystemPrompt, addHiddenRange, removeHiddenRange, setMaxOutputTokens } = useSettingsStore();
  const { messages } = useChatStore();
  const [fromStr, setFromStr] = useState('');
  const [toStr, setToStr] = useState('');
  const [tokensStr, setTokensStr] = useState(maxOutputTokens ? String(maxOutputTokens) : '');
  const [promptText, setPromptText] = useState(systemPrompt);

  function handleAddRange() {
    const from = parseInt(fromStr, 10);
    const to = parseInt(toStr, 10);
    if (isNaN(from) || isNaN(to) || from < 1 || to < from) {
      Alert.alert('提示', '请输入有效的范围（起始 ≤ 结束，且 ≥ 1）');
      return;
    }
    addHiddenRange({ from, to });
    setFromStr('');
    setToStr('');
  }

  function handleSaveTokens() {
    const val = tokensStr.trim();
    if (!val) {
      setMaxOutputTokens(null);
      Alert.alert('已保存', '输出字数不限制');
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      Alert.alert('提示', '请输入有效的正整数');
      return;
    }
    setMaxOutputTokens(num);
    Alert.alert('已保存', `AI 最大输出 ${num} tokens`);
  }

  const messageCount = messages.filter((m) => m.role === 'user' || m.role === 'assistant').length;

  return (
    <ScrollView style={styles.content}>
      {/* System Prompt */}
      <Text style={styles.sectionTitle}>System Prompt</Text>
      <Text style={styles.hint}>此内容会放在所有消息最前面发送给 AI</Text>
      <TextInput
        style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
        value={promptText}
        onChangeText={setPromptText}
        onBlur={() => setSystemPrompt(promptText.trim())}
        multiline
        placeholder="You are a helpful assistant."
        placeholderTextColor={colors.textTertiary}
      />

      {/* 消息条数 */}
      <Text style={styles.sectionTitle}>当前对话</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>消息条数</Text>
        <Text style={styles.infoValue}>{messageCount} 条</Text>
      </View>

      {/* 隐藏消息 */}
      <Text style={styles.sectionTitle}>隐藏消息</Text>
      <Text style={styles.hint}>隐藏的消息不会发送给 AI，可用于节省 token</Text>

      {hiddenRanges.length > 0 && (
        <View style={styles.rangeList}>
          {hiddenRanges.map((r, i) => (
            <View key={i} style={styles.rangeItem}>
              <Text style={styles.rangeText}>第 {r.from} 条 ~ 第 {r.to} 条</Text>
              <Pressable onPress={() => removeHiddenRange(i)}>
                <Text style={styles.rangeDelete}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.rangeInputRow}>
        <Text style={styles.rangeLabel}>从第</Text>
        <TextInput style={styles.rangeInput} value={fromStr} onChangeText={setFromStr}
          keyboardType="number-pad" placeholder="X" placeholderTextColor={colors.textTertiary} />
        <Text style={styles.rangeLabel}>条到第</Text>
        <TextInput style={styles.rangeInput} value={toStr} onChangeText={setToStr}
          keyboardType="number-pad" placeholder="Y" placeholderTextColor={colors.textTertiary} />
        <Text style={styles.rangeLabel}>条</Text>
        <Pressable style={styles.rangeAddButton} onPress={handleAddRange}>
          <Text style={styles.rangeAddText}>添加</Text>
        </Pressable>
      </View>

      {/* AI 输出字数限制 */}
      <Text style={styles.sectionTitle}>AI 输出限制</Text>
      <Text style={styles.hint}>限制 AI 单次回复的最大 token 数，留空则不限制</Text>
      <View style={styles.modelRow}>
        <TextInput style={[styles.input, { flex: 1 }]} value={tokensStr} onChangeText={setTokensStr}
          keyboardType="number-pad" placeholder="不限制" placeholderTextColor={colors.textTertiary} />
        <Pressable style={styles.fetchButton} onPress={handleSaveTokens}>
          <Text style={styles.fetchButtonText}>保存</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/* ==================== TTS 配置 Tab ==================== */

const TTS_MODELS = ['speech-02-hd', 'speech-02-turbo', 'speech-2.8-hd'];

function TTSConfigTab() {
  const { ttsConfig, setTTSConfig } = useSettingsStore();
  const [groupId, setGroupId] = useState(ttsConfig.groupId);
  const [apiKey, setApiKey] = useState(ttsConfig.apiKey);
  const [model, setModel] = useState(ttsConfig.model);
  const [voiceId, setVoiceId] = useState(ttsConfig.voiceId);
  const [speed, setSpeed] = useState(String(ttsConfig.speed));
  const [vol, setVol] = useState(String(ttsConfig.vol));
  const [pitch, setPitch] = useState(String(ttsConfig.pitch));
  const [testing, setTesting] = useState(false);

  function handleSave() {
    if (!groupId.trim() || !apiKey.trim()) {
      Alert.alert('提示', '请填写 Group ID 和 API Key');
      return;
    }
    if (!voiceId.trim()) {
      Alert.alert('提示', '请填写 Voice ID');
      return;
    }
    const s = parseFloat(speed) || 1;
    const v = parseFloat(vol) || 1;
    const p = parseFloat(pitch) || 0;
    setTTSConfig({ groupId: groupId.trim(), apiKey: apiKey.trim(), model, voiceId: voiceId.trim(), speed: s, vol: v, pitch: p });
    Alert.alert('已保存', 'TTS 配置已保存');
  }

  async function handleTest() {
    if (!groupId.trim() || !apiKey.trim() || !voiceId.trim()) {
      Alert.alert('提示', '请先填写 Group ID、API Key 和 Voice ID');
      return;
    }
    setTesting(true);
    try {
      const testConfig: TTSConfig = {
        groupId: groupId.trim(),
        apiKey: apiKey.trim(),
        model,
        voiceId: voiceId.trim(),
        speed: parseFloat(speed) || 1,
        vol: parseFloat(vol) || 1,
        pitch: parseFloat(pitch) || 0,
      };
      await playTTS('你好，这是一段语音合成测试。', testConfig);
      Alert.alert('播放成功', 'TTS 配置有效');
    } catch (e: any) {
      Alert.alert('播放失败', e.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>MiniMax TTS</Text>
      <Text style={styles.hint}>使用 MiniMax 语音合成服务，需要 Group ID 和 API Key</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Group ID</Text>
        <TextInput style={styles.input} value={groupId} onChangeText={setGroupId}
          placeholder="MiniMax Group ID" placeholderTextColor={colors.textTertiary}
          autoCapitalize="none" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>API Key</Text>
        <TextInput style={styles.input} value={apiKey} onChangeText={setApiKey}
          placeholder="MiniMax API Key" placeholderTextColor={colors.textTertiary}
          secureTextEntry autoCapitalize="none" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Voice ID</Text>
        <TextInput style={styles.input} value={voiceId} onChangeText={setVoiceId}
          placeholder="例如：male-qn-qingse" placeholderTextColor={colors.textTertiary}
          autoCapitalize="none" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>模型</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.configList}>
          {TTS_MODELS.map((m) => (
            <Pressable key={m}
              style={[styles.configChip, m === model && styles.configChipActive]}
              onPress={() => setModel(m)}
            >
              <Text style={[styles.configChipText, m === model && styles.configChipTextActive]}>{m}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>语速（0.5 ~ 2.0）</Text>
        <TextInput style={styles.input} value={speed} onChangeText={setSpeed}
          keyboardType="decimal-pad" placeholder="1" placeholderTextColor={colors.textTertiary} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>音量（0.1 ~ 10）</Text>
        <TextInput style={styles.input} value={vol} onChangeText={setVol}
          keyboardType="decimal-pad" placeholder="1" placeholderTextColor={colors.textTertiary} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>音调（-12 ~ 12）</Text>
        <TextInput style={styles.input} value={pitch} onChangeText={setPitch}
          keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textTertiary} />
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.testButton} onPress={handleTest} disabled={testing}>
          {testing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.testButtonText}>测试播放</Text>}
        </Pressable>
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存配置</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/* ==================== Styles ==================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  backIcon: { fontSize: 22, color: colors.text },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 4,
  },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  tabTextActive: { color: '#FFFFFF' },
  content: { flex: 1, padding: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    marginBottom: 10, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  configList: { marginBottom: 16 },
  configChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.surface, marginRight: 8,
  },
  configChipActive: { backgroundColor: colors.primary },
  configChipText: { fontSize: 13, fontWeight: '500', color: colors.text },
  configChipTextActive: { color: '#FFFFFF' },
  field: { marginBottom: 14 },
  label: { fontSize: 14, color: colors.text, marginBottom: 6, fontWeight: '500' },
  input: {
    backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: 12, padding: 14, fontSize: 14, color: colors.text,
  },
  modelRow: { flexDirection: 'row', gap: 8 },
  fetchButton: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
  },
  fetchButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 32 },
  testButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  testButtonText: { fontSize: 15, fontWeight: '500', color: colors.primary },
  saveButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  saveButtonText: { fontSize: 15, fontWeight: '500', color: '#FFFFFF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.background, borderRadius: 16, padding: 20, width: '85%', maxHeight: '60%' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 12 },
  modelList: { maxHeight: 300 },
  modelItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, marginBottom: 2 },
  modelItemActive: { backgroundColor: colors.surface },
  modelItemText: { fontSize: 14, color: colors.text },
  modelItemTextActive: { color: colors.primary, fontWeight: '500' },
  // Chat settings styles
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12,
  },
  infoLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  infoValue: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.textTertiary, marginBottom: 12 },
  rangeList: { marginBottom: 12 },
  rangeItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6,
  },
  rangeText: { fontSize: 14, color: colors.text },
  rangeDelete: { fontSize: 20, color: colors.danger, paddingHorizontal: 8 },
  rangeInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20,
  },
  rangeLabel: { fontSize: 14, color: colors.text },
  rangeInput: {
    backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.text,
    width: 50, textAlign: 'center',
  },
  rangeAddButton: {
    backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  rangeAddText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
});
