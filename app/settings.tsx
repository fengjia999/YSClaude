import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../src/theme/colors';
import { useSettingsStore, NamedAPIConfig } from '../src/stores/settings';

export default function SettingsScreen() {
  const router = useRouter();
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
    setName('');
    setBaseUrl('');
    setApiKey('');
    setModel('');
    setModels([]);
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
    if (!trimmedName) {
      Alert.alert('提示', '请输入配置名称');
      return;
    }
    if (!baseUrl.trim() || !apiKey.trim() || !model.trim()) {
      Alert.alert('提示', '请填写完整配置');
      return;
    }
    const config: NamedAPIConfig = {
      name: trimmedName,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
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
          if (apiConfigs.length > 1) {
            loadConfig(0);
          } else {
            handleNew();
          }
        },
      },
    ]);
  }

  if (!_hydrated) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>设置</Text>
        <Pressable style={styles.backButton} onPress={handleNew}>
          <Text style={styles.backIcon}>＋</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Saved configs */}
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
            </ScrollView>
          </>
        )}

        {/* Form */}
        <Text style={styles.sectionTitle}>API 配置</Text>
        <View style={styles.field}>
          <Text style={styles.label}>配置名称</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="例如：Claude 中转"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Base URL</Text>
          <TextInput
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="https://api.openai.com/v1"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Model</Text>
          <View style={styles.modelRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={model}
              onChangeText={setModel}
              placeholder="claude-sonnet-4-6"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
            />
            <Pressable style={styles.fetchButton} onPress={handleFetchModels} disabled={fetching}>
              {fetching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.fetchButtonText}>拉取</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.testButton} onPress={handleTest} disabled={testing}>
            {testing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.testButtonText}>测试连接</Text>
            )}
          </Pressable>
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>保存配置</Text>
          </Pressable>
        </View>
      </ScrollView>

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
                  <Text style={[styles.modelItemText, item === model && styles.modelItemTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36, height: 36,
    justifyContent: 'center', alignItems: 'center', borderRadius: 8,
  },
  backIcon: { fontSize: 22, color: colors.text },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  content: { flex: 1, padding: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    marginBottom: 10, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  configList: { marginBottom: 16 },
  configChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16, backgroundColor: colors.surface, marginRight: 8,
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
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  saveButtonText: { fontSize: 15, fontWeight: '500', color: '#FFFFFF' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.background, borderRadius: 16,
    padding: 20, width: '85%', maxHeight: '60%',
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 12 },
  modelList: { maxHeight: 300 },
  modelItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, marginBottom: 2 },
  modelItemActive: { backgroundColor: colors.surface },
  modelItemText: { fontSize: 14, color: colors.text },
  modelItemTextActive: { color: colors.primary, fontWeight: '500' },
});
