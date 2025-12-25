import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Animated,
  Easing,
  Modal,
  Switch,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useTranslation } from '@context/LocaleContext';
import { useAuth } from '@context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import supabase from '@services/supabase';
import Button from '@components/common/Button';
import Ionicons from '@expo/vector-icons/Ionicons';
import { placeholderAvatarUrl, getOptimizedImageUrl } from '@services/storage';
import { getCache, setCache } from '@services/cache';
import haptics from '@services/haptics';
import useNotifications from '@hooks/useNotifications';
import ProfileDetailModal, { ProfileDetail } from '@components/ProfileDetailModal';

type SimilarUser = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  character_group: string | null;
  avatar_url?: string | null;
  similarity: number;
  hobbies_cipher?: string | null;
  hobbies_iv?: string | null;
};

type Pool = {
  size: number;
  users: SimilarUser[];
  available: boolean;
};

const ExploreSwipeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigation = useNavigation<any>();
  const { notifications, unreadCount } = useNotifications(user?.id, { enabled: true, limit: 50 });
  const [pool, setPool] = useState<SimilarUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ ageGroup: false, gender: false, characterGroup: false });
  const [useElo, setUseElo] = useState<boolean>(profile?.match_allow_elo ?? true);
  const [useHobbies, setUseHobbies] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  
  // Check cipher presence instead of array length since plaintext is gone
  const hasEnoughHobbies = !!profile?.hobbies_cipher;
  const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  const current = pool[0];
  const remaining = pool.length - 1;
  const anim = useRef(new Animated.Value(0)).current;
  const fading = useRef(new Animated.Value(1)).current;
  const screenWidth = useRef(Dimensions.get('window').width).current;
  const swipeThreshold = screenWidth * 0.25;

  const fetchPool = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('recommend-users', {
        body: {
          userId: user.id,
          filters,
          chunkSize: 500,
          poolSizes: [200],
          useElo,
          useHobbies: useHobbies && hasEnoughHobbies,
        },
      });
      if (fnErr) {
        setError(fnErr.message ?? 'Failed to load matches');
        return;
      }
      const payload = data as { pools?: Pool[]; error?: string };
      if (payload?.error) {
        setError(payload.error);
        return;
      }
      const users = (payload?.pools?.[0]?.users ?? []).filter((u) => u.id !== user.id);
      setPool(users);
      // await setCache(`pool:${user.id}:${useElo}:${JSON.stringify(filters)}`, users);
    } catch (e: any) {
      setError(e?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [filters, useElo, useHobbies, hasEnoughHobbies, user?.id]);

  useEffect(() => {
    // let mounted = true;
    (async () => {
      if (!user?.id) return;
      // Disable cache for now to ensure hobby toggle works immediately
      // const cached = await getCache<SimilarUser[]>(`pool:${user.id}:${useElo}:${JSON.stringify(filters)}`, CACHE_TTL_MS);
      // if (cached && mounted) {
      //   setPool(cached);
      // }
      await fetchPool();
    })();
    // return () => { mounted = false; };
  }, [fetchPool]); // simplified deps

  const advance = useCallback(() => {
    setPool((prev) => {
      if (prev.length <= 1) {
        void fetchPool();
        return prev;
      }
      return prev.slice(1);
    });
  }, [fetchPool]);

  const onSwipe = useCallback(
    async (action: 'like' | 'skip', dxOverride?: number) => {
      const direction = action === 'like' ? 1 : -1;
      if (action === 'like') {
        void haptics.light();
      } else {
        void haptics.selection();
      }
      // ... same match-update logic ...
      if (current?.id && user?.id) {
        supabase.functions.invoke('match-update', {
            body: {
              actorId: user.id,
              targetId: current.id,
              outcome: action === 'like' ? 'like' : 'skip',
            },
          }).catch(() => {});
      }

      Animated.parallel([
        Animated.timing(anim, {
          toValue: dxOverride ? dxOverride / swipeThreshold : direction,
          duration: 220,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(fading, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        void advance();
        requestAnimationFrame(() => {
          anim.setValue(0);
          fading.setValue(1);
        });
      });
    },
    [advance, anim, fading, swipeThreshold, current?.id, user?.id],
  );

  // ... interpolations ...
  const likeOpacity = anim.interpolate({
    inputRange: [0, 1, 1.5],
    outputRange: [0, 0.6, 0.6],
    extrapolate: 'clamp',
  });
  const likeScale = anim.interpolate({
    inputRange: [0, 1, 1.5],
    outputRange: [1, 1.5, 2],
    extrapolate: 'clamp',
  });
  const skipOpacity = anim.interpolate({
    inputRange: [-1.5, -1, 0],
    outputRange: [0.6, 0.6, 0],
    extrapolate: 'clamp',
  });
  const skipScale = anim.interpolate({
    inputRange: [-1.5, -1, 0],
    outputRange: [2, 1.5, 1],
    extrapolate: 'clamp',
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, gesture) => {
          const dx = gesture.dx;
          const normalized = dx / swipeThreshold;
          anim.setValue(Math.max(-1.5, Math.min(1.5, normalized * 0.8)));
          const clampedOpacity = Math.min(1, Math.abs(normalized) / 1.2);
          fading.setValue(1 - clampedOpacity * 0.2);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const dx = gesture.dx;
          const dy = gesture.dy;
          // Detect tap (small movement) to open details
          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
             setDetailVisible(true);
             Animated.spring(anim, { toValue: 0, useNativeDriver: true, friction: 6 }).start();
             Animated.spring(fading, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
             return;
          }

          if (dx > swipeThreshold) {
            onSwipe('like', dx);
          } else if (dx < -swipeThreshold) {
            onSwipe('skip', dx);
          } else {
            Animated.spring(anim, { toValue: 0, useNativeDriver: true, friction: 6 }).start();
            Animated.spring(fading, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
          }
        },
      }),
    [onSwipe, swipeThreshold, anim, fading],
  );

  const animatedStyle = {
    transform: [
      {
        translateX: anim.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-240, 0, 240],
        }),
      },
      {
        rotate: anim.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: ['-12deg', '0deg', '12deg'],
        }),
      },
    ],
    opacity: fading,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <View style={{ padding: 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{t('explore.title')}</Text>
          <Pressable
            style={{ marginLeft: 'auto', padding: 8 }}
            onPress={() => setSettingsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
          >
            <Ionicons name="options-outline" size={20} color={toRgb(theme.colors['--text-primary'])} />
          </Pressable>
        </View>
        {/* <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>{t('explore.swipeSubtitle')}</Text> */}

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={toRgb(theme.colors['--brand-primary'])} />
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 8 }}>{t('explore.loadingPool')}</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.center}>
            <Text style={{ color: toRgb(theme.colors['--danger']) }}>{error}</Text>
            <View style={{ height: 8 }} />
            <Button title={t('explore.retry')} onPress={fetchPool} />
          </View>
        )}

        {!loading && !error && current && (
          <Animated.View
            style={[
              styles.card,
              { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.12) },
              animatedStyle,
            ]}
            {...panResponder.panHandlers}
          >
            <Animated.View
              style={[
                styles.badge,
                { left: 16, backgroundColor: toRgba(theme.colors['--danger'], 0.15) },
                { opacity: skipOpacity, transform: [{ scale: skipScale }] },
              ]}
            >
              <Ionicons name="close" size={36} color={toRgb(theme.colors['--danger'])} />
            </Animated.View>
            <Animated.View
              style={[
                styles.badge,
                { right: 16, backgroundColor: toRgba(theme.colors['--brand-primary'], 0.15) },
                { opacity: likeOpacity, transform: [{ scale: likeScale }] },
              ]}
            >
              <Ionicons name="checkmark" size={36} color={toRgb(theme.colors['--brand-primary'])} />
            </Animated.View>
            
            <Image 
              source={{ uri: getOptimizedImageUrl(current.avatar_url || placeholderAvatarUrl, 600) }} 
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
            
            <View style={styles.infoOverlay}>
               <View>
                  <Text style={[styles.name, { color: '#fff' }]}>{current.username ?? 'Unknown'}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {current.age_group ?? '—'} · {current.gender ?? '—'}
                  </Text>
               </View>
               <Pressable onPress={() => setDetailVisible(true)} style={{padding: 8}}>
                  <Ionicons name="information-circle" size={28} color="#fff" />
               </Pressable>
            </View>

            <View style={styles.matchPill}>
               <Ionicons name="sparkles" size={12} color="#fff" style={{marginRight: 4}} />
               <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {Math.round(current.similarity * 100)}%
               </Text>
            </View>
          </Animated.View>
        )}

        {!loading && !error && current && (
          <View style={styles.actionRow}>
            {/* Buttons... same as before but maybe styled better */}
            <Pressable
              style={[
                styles.actionBtn,
                { backgroundColor: toRgba(theme.colors['--danger'], 0.12), borderColor: toRgba(theme.colors['--danger'], 0.5) },
              ]}
              onPress={() => onSwipe('skip')}
            >
              <Ionicons name="close" size={32} color={toRgb(theme.colors['--danger'])} />
            </Pressable>
            <View style={{ width: 24 }} />
            <Pressable
              style={[
                styles.actionBtn,
                {
                  backgroundColor: toRgba(theme.colors['--brand-primary'], 0.15),
                  borderColor: toRgba(theme.colors['--brand-primary'], 0.5),
                },
              ]}
              onPress={() => onSwipe('like')}
            >
              <Ionicons name="heart" size={32} color={toRgb(theme.colors['--brand-primary'])} />
            </Pressable>
          </View>
        )}

        {!loading && !error && !current && (
          <View style={styles.center}>
            <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>{t('explore.noMatches')}</Text>
            <View style={{ height: 8 }} />
            <Button title={t('explore.retry')} onPress={fetchPool} />
          </View>
        )}
      </View>

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSettingsOpen(false)} />
        <View
          style={[
            styles.modalCard,
            { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.12) },
          ]}
        >
          <Text style={[styles.name, { color: toRgb(theme.colors['--text-primary']), marginBottom: 8, fontSize: 20 }]}>{t('explore.filters')}</Text>
          
          <View style={styles.filterRow}>
            <Ionicons name="pulse-outline" size={18} color={toRgb(theme.colors['--text-secondary'])} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>{t('explore.useElo')}</Text>
              <Text style={{ color: toRgb(theme.colors['--text-muted']), fontSize: 11 }}>{t('explore.useEloHint')}</Text>
            </View>
            <Switch value={useElo} onValueChange={setUseElo} />
          </View>

          <View style={styles.filterRow}>
             <Ionicons name="pricetags-outline" size={18} color={hasEnoughHobbies ? toRgb(theme.colors['--text-secondary']) : toRgb(theme.colors['--text-muted'])} style={{ marginRight: 8 }} />
             <View style={{ flex: 1 }}>
                <Text style={{ color: hasEnoughHobbies ? toRgb(theme.colors['--text-secondary']) : toRgb(theme.colors['--text-muted']) }}>
                  {t('explore.useHobbies')}
                </Text>
                 <Text style={{ color: toRgb(theme.colors['--text-muted']), fontSize: 11 }}>
                  {t('explore.useHobbiesHint')}
                </Text>
             </View>
             <Switch value={useHobbies} onValueChange={setUseHobbies} disabled={!hasEnoughHobbies} />
          </View>

          {(['ageGroup', 'gender', 'characterGroup'] as const).map((key) => (
            <View key={key} style={styles.filterRow}>
              <Ionicons
                name={key === 'ageGroup' ? 'calendar-outline' : key === 'gender' ? 'male-female-outline' : 'sparkles-outline'}
                size={18}
                color={toRgb(theme.colors['--text-secondary'])}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: toRgb(theme.colors['--text-secondary']), flex: 1 }}>
                {key === 'ageGroup'
                  ? t('explore.filterAge')
                  : key === 'gender'
                  ? t('explore.filterGender')
                  : t('explore.filterArchetype')}
              </Text>
              <Switch value={filters[key]} onValueChange={() => setFilters((prev) => ({ ...prev, [key]: !prev[key] }))} />
            </View>
          ))}
          <View style={{height: 12}} />
          <Button title={t('explore.applyFilters')} onPress={() => { setSettingsOpen(false); fetchPool(); }} />
        </View>
      </Modal>

      {/* Profile Detail Modal */}
      <ProfileDetailModal 
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        profile={current ? {
          ...current,
          match_percentage: current.similarity * 100
        } : null}
        currentUserHobbies={profile?.hobbies ?? []}
        onLike={() => { setDetailVisible(false); onSwipe('like'); }}
        onSkip={() => { setDetailVisible(false); onSwipe('skip'); }}
      />
    </SafeAreaView>
  );
};

export default ExploreSwipeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 12 },
  center: { alignItems: 'center', padding: 16, flex: 1, justifyContent: 'center' },
  card: { 
    borderRadius: 24, 
    height: '75%', 
    width: '100%',
    alignItems: 'center', 
    borderWidth: 1, 
    overflow: 'hidden',
    position: 'relative'
  },
  avatar: { width: '100%', height: '100%', backgroundColor: '#333' },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.4)', // Gradient in future?
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  name: { fontSize: 28, fontWeight: '800' },
  matchPill: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#8b5cf6', // Brand primary hardcoded or passed dynamically
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: {width:0, height:2}
  },
  actionRow: { 
    marginTop: 24, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'relative' 
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: '#fff' // Override for consistency
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { position: 'absolute', left: 16, right: 16, top: '20%', borderRadius: 20, padding: 20, borderWidth: 1 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  badge: { position: 'absolute', top: 40, padding: 10, borderRadius: 12, borderWidth: 2, borderColor: 'white', zIndex: 10 },
  actionBadge: { position: 'absolute', top: -24, padding: 10, borderRadius: 14 },
});
