import React, { useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder, GestureResponderEvent, PanResponderGestureState, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  title?: string;
  onBack?: () => void;
};

const SwipeHeader: React.FC<Props> = ({ title = '', onBack }) => {
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
    <View style={styles.wrap} {...responder.panHandlers}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
};

export default SwipeHeader;

const styles = StyleSheet.create({
  wrap: {
    height: 56,
    backgroundColor: '#14151a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  backBtn: { position: 'absolute', left: 8, height: 56, width: 40, alignItems: 'center', justifyContent: 'center' },
});
