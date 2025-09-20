import React, { useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder, GestureResponderEvent, PanResponderGestureState, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';

type Props = {
  title?: string;
  onBack?: () => void;
};

const SwipeHeader: React.FC<Props> = ({ title = '', onBack }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
          return Math.abs(g.dx) > 12 && Math.abs(g.dy) < 10; // Mostly horizontal
        },
        onPanResponderRelease: (_e, g) => {
          // Spec: swipe left on header goes back
          if (g.dx < -24 && Math.abs(g.vx) > 0.15) {
            onBack?.();
          }
        },
      }),
    [onBack]
  );

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: toRgb(theme.colors['--surface']),
          borderBottomColor: toRgba(theme.colors['--border'], 0.08),
          paddingTop: insets.top + 8,
          minHeight: insets.top + 56,
        },
      ]}
      {...responder.panHandlers}
    >
      {/* Left control */}
      {onBack ? (
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.sideBtn}>
          <Ionicons name="chevron-back" size={22} color={toRgb(theme.colors['--text-secondary'])} />
        </Pressable>
      ) : (
        <View style={styles.sideBtn} />
      )}

      {/* Title */}
      <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]} numberOfLines={1}>
        {title}
      </Text>

      {/* Right spacer to balance layout */}
      <View style={styles.sideBtn} />
    </View>
  );
};

export default SwipeHeader;

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  sideBtn: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center' },
});
