import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'warning' | 'neutral';
  style?: ViewStyle | ViewStyle[];
};

const Button: React.FC<Props> = ({ title, onPress, disabled, variant = 'primary', style }) => {
  const { theme } = useTheme();
  const colorKey =
    variant === 'primary'
      ? '--brand-primary'
      : variant === 'danger'
      ? '--danger'
      : variant === 'warning'
      ? '--warning'
      : '--neutral';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: toRgb(theme.colors[colorKey]),
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Button;
