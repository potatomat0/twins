import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';

const LoadingSpinner = () => {
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={toRgb(theme.colors['--brand-primary'])} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { padding: 12, alignItems: 'center', justifyContent: 'center' },
});

export default LoadingSpinner;
