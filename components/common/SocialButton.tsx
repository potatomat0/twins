import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from '@context/LocaleContext';

type Provider = 'google' | 'facebook' | 'apple' | 'microsoft';

type Props = {
  provider: Provider;
  title?: string;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
};

const brand: Record<Provider, { color: string; icon: string; label: string }> = {
  google: { color: '#4285F4', icon: 'google', label: 'Google' },
  facebook: { color: '#1877F2', icon: 'facebook', label: 'Facebook' },
  apple: { color: '#000000', icon: 'apple', label: 'Apple' },
  microsoft: { color: '#2F2F2F', icon: 'microsoft', label: 'Microsoft' },
};

const SocialButton: React.FC<Props> = ({ provider, title, onPress, style }) => {
  const cfg = brand[provider];
  const { t } = useTranslation();
  const displayTitle = title ?? t('common.signInWithProvider', { provider: cfg.label });
  const accessibilityLabel = t('common.signInWithProvider', { provider: cfg.label });
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: cfg.color, opacity: pressed ? 0.9 : 1 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.row}>
        <FontAwesome5 name={cfg.icon as any} size={16} color="#fff" style={{ marginRight: 0 }} />
        <Text style={styles.text}>{displayTitle}</Text>
      </View>
    </Pressable>
  );
};

export default SocialButton;

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { color: '#fff', fontWeight: '700' },
});
