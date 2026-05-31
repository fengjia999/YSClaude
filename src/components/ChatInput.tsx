import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { useSettingsStore } from '../stores/settings';

interface Props {
  onSend: (text: string, imageUri?: string) => void;
  onTriggerResponse: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  onModelPress?: () => void;
}

export function ChatInput({ onSend, onTriggerResponse, disabled, isStreaming, onStop, onModelPress }: Props) {
  const [text, setText] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { apiConfigs, activeConfigIndex } = useSettingsStore();
  const current = apiConfigs[activeConfigIndex];
  const currentModel = current?.name || current?.model || '未配置';

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingImage(result.assets[0].uri);
    }
  };

  const handleSend = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed && !pendingImage) return;
    if (disabled) return;
    onSend(trimmed, pendingImage || undefined);
    setText('');
    setPendingImage(null);
  };

  const handleChangeText = (next: string) => {
    if (
      next.length === text.length + 1 &&
      next.startsWith(text) &&
      next.endsWith('\n')
    ) {
      handleSend(text);
      return;
    }
    setText(next);
  };

  const handleStopOrSend = () => {
    if (isStreaming) {
      onStop?.();
      return;
    }
    const trimmed = text.trim();
    if (trimmed || pendingImage) {
      onSend(trimmed, pendingImage || undefined);
      setText('');
      setPendingImage(null);
    }
    onTriggerResponse();
  };

  const getSendIcon = () => {
    if (isStreaming) return require('../../assets/stopsend.png');
    if (text.trim() || pendingImage) return require('../../assets/send2.png');
    return require('../../assets/send1.png');
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.container}>
        {pendingImage && (
          <View style={styles.previewRow}>
            <View style={styles.previewWrap}>
              <Image source={{ uri: pendingImage }} style={styles.previewImage} resizeMode="cover" />
              <Pressable style={styles.previewClose} onPress={() => setPendingImage(null)}>
                <Text style={styles.previewCloseText}>✕</Text>
              </Pressable>
            </View>
          </View>
        )}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChangeText}
          placeholder="Reply to Claude..."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={10000}
          editable={!disabled}
        />
        <View style={styles.toolbar}>
          <Pressable style={styles.optionsButton} onPress={pickImage}>
            <Image source={require('../../assets/optionsbutton.png')} style={styles.optionsImage} resizeMode="contain" />
          </Pressable>

          <Pressable style={styles.modelPill} onPress={onModelPress}>
            <Text style={styles.modelText} numberOfLines={1}>{currentModel}</Text>
          </Pressable>

          <View style={styles.rightButtons}>
            <Pressable style={styles.voiceButton}>
              <Image source={require('../../assets/voice.png')} style={styles.voiceImage} resizeMode="contain" />
            </Pressable>
            <Pressable style={styles.sendButton} onPress={handleStopOrSend}>
              <Image source={getSendIcon()} style={styles.sendImage} resizeMode="contain" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  container: {
    backgroundColor: colors.inputBackground,
    borderRadius: 24,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  previewRow: {
    marginBottom: 8,
  },
  previewWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: 72,
    height: 72,
  },
  previewClose: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Sohne',
    maxHeight: 120,
    minHeight: 28,
    paddingVertical: 0,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  optionsButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsImage: {
    width: 28,
    height: 28,
  },
  modelPill: {
    backgroundColor: colors.surfaceHover,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    maxWidth: 180,
  },
  modelText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  rightButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    alignItems: 'center',
    gap: 8,
  },
  voiceButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceImage: {
    width: 30,
    height: 30,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendImage: {
    width: 30,
    height: 30,
  },
});
