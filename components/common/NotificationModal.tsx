import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';

type Props = {
  visible: boolean;
  title?: string;
  message?: string | React.ReactNode;
  primaryText?: string;
  onPrimary?: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
  onRequestClose?: () => void;
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
}) => {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onRequestClose} />
      <View style={[styles.sheet, { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.08) }]}>        
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {typeof message === 'string' ? <Text style={styles.message}>{message}</Text> : message}
        <View style={styles.actions}>
          {secondaryText ? (
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onSecondary}>
              <Text style={styles.btnSecondaryText}>{secondaryText}</Text>
            </Pressable>
          ) : null}
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onPrimary}>
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
  title: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  message: { color: '#ddd', fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnPrimary: { backgroundColor: 'rgb(99, 102, 241)' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnSecondary: { backgroundColor: 'rgba(255,255,255,0.06)' },
  btnSecondaryText: { color: '#fff', fontWeight: '600' },
});
