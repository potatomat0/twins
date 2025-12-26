import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, Dimensions, ActivityIndicator, Animated, PanResponder } from 'react-native';
import { Image } from 'expo-image';
import { toRgb, toRgba } from '@themes/index';
import { useTheme } from '@context/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getOptimizedImageUrl } from '@services/storage';
import { decryptGenericRemote } from '@services/scoreCrypto';
import { useTranslation } from '@context/LocaleContext';
import * as Haptics from 'expo-haptics';

export type ProfileDetail = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  character_group: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  hobbies_cipher?: string | null;
  hobbies_iv?: string | null;
  hobbies?: string[] | null;
  hobby_embedding?: number[] | string | null;
  match_percentage?: number | null; // For display
  pca_dim1?: number | null;
  pca_dim2?: number | null;
  pca_dim3?: number | null;
  pca_dim4?: number | null;
};

type Props = {
  visible: boolean;
  profile: ProfileDetail | null;
  onClose: () => void;
  onLike?: () => void; // Optional actions if used in swipe/explore context
  onSkip?: () => void;
  onMessage?: () => void;
  currentUserHobbies?: string[]; // To highlight matches
};

const ProfileDetailModal: React.FC<Props> = ({ 
  visible, 
  profile, 
  onClose, 
  onLike, 
  onSkip, 
  onMessage,
  currentUserHobbies = [] 
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [decrypting, setDecrypting] = useState(false);
  const [visibleState, setVisibleState] = useState(false);
  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          pan.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 120) {
          Animated.timing(pan, {
            toValue: Dimensions.get('window').height,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            void Haptics.selectionAsync();
            onClose();
            setTimeout(() => pan.setValue(0), 100);
          });
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      pan.setValue(0);
    }
  }, [visible, pan]);

  useEffect(() => {
    if (profile?.hobbies && profile.hobbies.length) {
      setHobbies(profile.hobbies);
      return;
    }
    if (visible && profile?.hobbies_cipher && profile?.hobbies_iv) {
      setDecrypting(true);
      decryptGenericRemote<string[]>(profile.hobbies_cipher, profile.hobbies_iv)
        .then((decrypted) => {
          if (decrypted && Array.isArray(decrypted)) {
            setHobbies(decrypted);
          } else {
            setHobbies([]);
          }
        })
        .finally(() => setDecrypting(false));
    } else {
      setHobbies([]);
    }
  }, [visible, profile]);

  useEffect(() => {
    if (visible !== visibleState) {
      setVisibleState(visible);
      void Haptics.selectionAsync();
    }
  }, [visible, visibleState]);

  if (!visible || !profile) return null;

  const imageUrl = getOptimizedImageUrl(profile.avatar_url, 1080); // High res for detail

  // Color palette for hobbies
  const hobbyColors = [
    theme.colors['--brand-primary'],
    theme.colors['--accent-cyan'],
    theme.colors['--accent-pink'],
    theme.colors['--accent-orange'],
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Animated.View
        style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']), transform: [{ translateY: pan }] }]}
        {...panResponder.panHandlers}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} bounces={false}>
          {/* Header Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
            <Pressable 
              style={[styles.closeBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]} 
              onPress={() => {
                void Haptics.selectionAsync();
                onClose();
              }}
            >
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </Pressable>
            
            {/* Match Badge */}
            {profile.match_percentage !== undefined && profile.match_percentage !== null && (
              <View style={[styles.matchBadge, { backgroundColor: toRgb(theme.colors['--brand-primary']) }]}>
                <Ionicons name="sparkles" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {t('explore.matchLabel', { percent: Math.round(profile.match_percentage) })}
                </Text>
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.content}>
            <Text style={[styles.name, { color: toRgb(theme.colors['--text-primary']) }]}>
              {profile.username ?? 'Unknown'}, {profile.age_group}
            </Text>
            
            <View style={styles.metaRow}>
              <View style={[styles.pill, { borderColor: toRgba(theme.colors['--border'], 0.2) }]}>
                <Ionicons name="male-female" size={14} color={toRgb(theme.colors['--text-secondary'])} />
                <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginLeft: 6 }}>
                  {profile.gender}
                </Text>
              </View>
              
              <View style={[styles.pill, { borderColor: toRgba(theme.colors['--border'], 0.2) }]}>
                <Ionicons name="person" size={14} color={toRgb(theme.colors['--text-secondary'])} />
                <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginLeft: 6 }}>
                  {profile.character_group ?? '—'}
                </Text>
              </View>
            </View>

            {/* Hobbies Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: toRgb(theme.colors['--text-primary']) }]}>
                {t('settings.hobbies')}
              </Text>
             {decrypting ? (
               <ActivityIndicator color={toRgb(theme.colors['--brand-primary'])} style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
             ) : hobbies.length > 0 ? (
               <View style={styles.hobbyWrap}>
                 {hobbies.map((hobby, idx) => {
                   // Highlight if it matches one of current user's hobbies (case-insensitive simple match)
                   const isMatch = currentUserHobbies.some(h => h.toLowerCase() === hobby.toLowerCase());
                   const bgColor = isMatch ? theme.colors['--brand-primary'] : hobbyColors[idx % hobbyColors.length];
                   
                   return (
                     <View 
                       key={idx} 
                       style={[
                         styles.hobbyTag, 
                         { backgroundColor: toRgb(bgColor) }
                       ]}
                     >
                       {isMatch && <Ionicons name="star" size={10} color="#fff" style={{ marginRight: 4 }} />}
                       <Text style={styles.hobbyText}>{hobby}</Text>
                     </View>
                   );
                 })}
               </View>
             ) : (
               <Text style={{ color: toRgb(theme.colors['--text-muted']), fontStyle: 'italic' }}>
                 No hobbies listed.
               </Text>
             )}
            </View>

            {/* Bio (if available) - Assuming bio might be added later, currently mostly implied by character group */}
            {profile.bio && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: toRgb(theme.colors['--text-primary']) }]}>
                  About
                </Text>
                <Text style={{ color: toRgb(theme.colors['--text-secondary']), lineHeight: 22 }}>
                  {profile.bio}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Action Bar (if actions enabled) */}
        {(onLike || onSkip || onMessage) && (
          <View style={[styles.actionBar, { backgroundColor: toRgb(theme.colors['--surface']), borderTopColor: toRgba(theme.colors['--border'], 0.1) }]}>
            {onSkip && (
              <Pressable 
                style={[styles.roundBtn, { borderColor: toRgba(theme.colors['--danger'], 0.5) }]}
                onPress={onSkip}
              >
                <Ionicons name="close" size={32} color={toRgb(theme.colors['--danger'])} />
              </Pressable>
            )}
            
            {onLike && (
              <Pressable 
                style={[styles.roundBtn, { borderColor: toRgba(theme.colors['--brand-primary'], 0.5), transform: [{ scale: 1.1 }] }]}
                onPress={onLike}
              >
                <Ionicons name="heart" size={32} color={toRgb(theme.colors['--brand-primary'])} />
              </Pressable>
            )}

            {onMessage && (
              <Pressable 
                style={[styles.roundBtn, { borderColor: toRgba(theme.colors['--accent-cyan'], 0.5) }]}
                onPress={onMessage}
              >
                <Ionicons name="chatbubble" size={28} color={toRgb(theme.colors['--accent-cyan'])} />
              </Pressable>
            )}
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: { width: '100%', height: width * 1.1, position: 'relative' },
  image: { width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  content: { padding: 20, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: 'inherit' }, // Negative margin to overlap image slightly if bg color matches
  name: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  pill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    borderWidth: 1 
  },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  hobbyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hobbyTag: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  hobbyText: { color: '#fff', fontWeight: '600' },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  roundBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)', // Subtle glass feel
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default ProfileDetailModal;
