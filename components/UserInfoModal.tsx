import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { toRgb, toRgba } from '@themes/index';
import { useTheme } from '@context/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from '@components/common/Button';

export type UserInfo = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  character_group: string | null;
  avatar_url?: string | null;
  bio?: string | null;
};

type Props = {
  visible: boolean;
  user: UserInfo | null;
  onClose: () => void;
  onLike?: (user: UserInfo) => void;
  onSkip?: (user: UserInfo) => void;
  onMessage?: (user: UserInfo) => void;
  showActions?: boolean;
};

const UserInfoModal: React.FC<Props> = ({ visible, user, onClose, onLike, onSkip, onMessage, showActions = true }) => {
  const { theme } = useTheme();
  if (!user) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.card,
          {
            backgroundColor: toRgb(theme.colors['--surface']),
            borderColor: toRgba(theme.colors['--border'], 0.12),
          },
        ]}
      >
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={toRgb(theme.colors['--text-primary'])} />
        </Pressable>
        <Image source={{ uri: user.avatar_url || 'https://placehold.co/320x320/png' }} style={styles.avatar} />
        <Text style={[styles.name, { color: toRgb(theme.colors['--text-primary']) }]}>{user.username ?? 'Unknown'}</Text>
        <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 8 }}>
          {user.age_group ?? '—'} · {user.gender ?? '—'} · {user.character_group ?? '—'}
        </Text>
        {user.bio ? (
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), textAlign: 'center', marginBottom: 12 }}>
            {user.bio}
          </Text>
        ) : null}
        {showActions ? (
          <View style={styles.row}>
            <Button
              title="Skip"
              onPress={() => onSkip?.(user)}
              variant="danger"
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Like"
              onPress={() => onLike?.(user)}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}
        {onMessage ? (
          <View style={[styles.row, { marginTop: 10 }]}>
            <Button
              title="Message"
              onPress={() => onMessage?.(user)}
              style={{ flex: 1 }}
              variant="secondary"
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

export default UserInfoModal;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '18%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  closeBtn: { position: 'absolute', top: 10, right: 10, padding: 8 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '800' },
  row: { flexDirection: 'row', width: '100%', marginTop: 8 },
});
