import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  title?: string;
  message?: string | React.ReactNode;
  primaryText?: string;
  onPrimary?: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
  onRequestClose?: () => void;
  primaryVariant?: 'primary' | 'danger' | 'accent';
  secondaryVariant?: 'muted' | 'accent' | 'primary';
  stacked?: boolean; // render actions vertically with full-width buttons
};

const NotificationModal: React.FC<Props> = ({
  visible,
  title,
  message,
  primaryText = 'OK',
  onPrimary,
  secondaryText,
  onSecondary,
  onRequestClose,
  primaryVariant = 'primary',
  secondaryVariant = 'muted',
  stacked = false,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const primaryBg =
    primaryVariant === 'danger'
      ? toRgb(theme.colors['--danger'])
      : primaryVariant === 'accent'
      ? toRgb(theme.colors['--accent-cyan'])
      : 'rgb(99, 102, 241)'; // brand primary fallback
  const secondaryBg =
    secondaryVariant === 'accent'
      ? toRgb(theme.colors['--accent-cyan'])
      : secondaryVariant === 'primary'
      ? 'rgb(99, 102, 241)'
      : toRgba(theme.colors['--border'], 0.06);
  const secondaryTxt = secondaryVariant === 'muted' ? toRgb(theme.colors['--text-primary']) : '#fff';
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onRequestClose} />
      <View style={[
        styles.sheet,
        {
          backgroundColor: toRgb(theme.colors['--surface']),
          borderColor: toRgba(theme.colors['--border'], 0.08),
          bottom: 16 + insets.bottom,
          paddingBottom: 16 + insets.bottom,
        },
      ]}>        
        {title ? <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{title}</Text> : null}
        {typeof message === 'string' ? <Text style={[styles.message, { color: toRgb(theme.colors['--text-secondary']) }]}>{message}</Text> : message}
        <View style={[styles.actions, stacked ? { flexDirection: 'column', justifyContent: 'flex-start' } : null]}>
          {secondaryText ? (
            <Pressable style={[styles.btn, styles.btnSecondary, { backgroundColor: secondaryBg }, stacked ? styles.btnBlock : null]} onPress={onSecondary}>
              <Text style={[styles.btnSecondaryText, { color: secondaryTxt }]}>{secondaryText}</Text>
            </Pressable>
          ) : null}
          <Pressable style={[styles.btn, styles.btnPrimary, { backgroundColor: primaryBg }, stacked ? styles.btnBlock : null]} onPress={onPrimary}>
            <Text style={styles.btnPrimaryText}>{primaryText}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default NotificationModal;

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  message: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnPrimary: {},
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnSecondary: {},
  btnSecondaryText: { fontWeight: '600' },
  btnBlock: { alignSelf: 'stretch', textAlign: 'center' as any },
});
