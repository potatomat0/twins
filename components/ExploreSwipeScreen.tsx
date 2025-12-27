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
import Button from '@components/common/Button';
import Ionicons from '@expo/vector-icons/Ionicons';
import { placeholderAvatarUrl, getOptimizedImageUrl } from '@services/storage';
import haptics from '@services/haptics';
import useNotifications from '@hooks/useNotifications';
import ProfileDetailModal, { ProfileDetail } from '@components/ProfileDetailModal';
import { useRecommendations } from '@context/RecommendationContext';
import supabase from '@services/supabase';

const ExploreSwipeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigation = useNavigation<any>();
  const { notifications, unreadCount } = useNotifications(user?.id, { enabled: true, limit: 50 });
  const {
    deck,
    loading,
    initialLoading,
    hasMore,
    exhausted,
    filters,
    useHobbies,
    setFilters,
    setUseHobbies,
    loadMore,
    removeCard,
    reset,
  } = useRecommendations();
  const hasEnoughHobbies = !!profile?.hobbies_cipher;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const genderOptions = useMemo(() => ['All', 'Male', 'Female', 'Non-Binary'], []);
  const ageOptions = useMemo(() => ['18-24', '25-35', '36-45', '46-60', '60+'], []);
  const genderLabel = useCallback(
    (g: string) => {
      if (g === 'All') return t('explore.genderAll');
      if (g === 'Male') return t('registration.options.genders.male');
      if (g === 'Female') return t('registration.options.genders.female');
      return t('registration.options.genders.nonBinary');
    },
    [t],
  );
  const ageLabel = useCallback(
    (a: string) => {
      if (a === 'All') return t('explore.ageAll');
      switch (a) {
        case '18-24':
          return t('registration.options.ageGroups.range18_24');
        case '25-35':
          return t('registration.options.ageGroups.range25_35');
        case '36-45':
          return t('registration.options.ageGroups.range35_44');
        case '46-60':
          return t('registration.options.ageGroups.range45_plus');
        default:
          return a;
      }
    },
    [t],
  );

  const applyFilter = useCallback(
    (type: 'gender' | 'age', value: string) => {
      if (type === 'gender') {
        setFilters({ ...filters, genders: value === 'All' ? [] : [value] });
      } else {
        setFilters({ ...filters, ageGroups: value === 'All' ? [] : [value] });
      }
    },
    [filters, setFilters],
  );

  const applyArchetype = useCallback(
    (val: 'most' | 'least') => {
      setFilters({ ...filters, archetype: val });
    },
    [filters, setFilters],
  );

  const current = deck[0];
  const remaining = deck.length - 1;
  const anim = useRef(new Animated.Value(0)).current;
  const fading = useRef(new Animated.Value(1)).current;
  const screenWidth = useRef(Dimensions.get('window').width).current;
  const swipeThreshold = screenWidth * 0.25;
  const advance = useCallback(() => {
    if (!current) return;
    removeCard(current.id);
  }, [current, removeCard]);

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

        {initialLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={toRgb(theme.colors['--brand-primary'])} />
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 8 }}>{t('explore.loadingPool')}</Text>
          </View>
        ) : !current ? (
          <View style={styles.center}>
            <Text style={{ color: toRgb(theme.colors['--text-primary']), fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
              {t('explore.noListMatches')}
            </Text>
            <View style={{ height: 8 }} />
            <Button title={t('explore.retry')} onPress={loadMore} />
          </View>
        ) : (
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

        {!loading && current && (
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

          <Text style={[styles.modalTitle, { color: toRgb(theme.colors['--text-primary']) }]}>{t('explore.filterGender')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {genderOptions.map((g) => {
              const isActive = filters.genders?.length === 0 ? g === 'All' : filters.genders?.includes(g);
              return (
              <Pressable
                key={g}
                onPress={() => applyFilter('gender', g)}
                style={[
                  styles.chip,
                  {
                    borderColor: isActive ? toRgb(theme.colors['--brand-primary']) : toRgba(theme.colors['--border'], 0.3),
                    backgroundColor: isActive ? toRgba(theme.colors['--brand-primary'], 0.12) : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    color: isActive ? toRgb(theme.colors['--brand-primary']) : toRgb(theme.colors['--text-secondary']),
                    fontWeight: '600',
                  }}
                >
                  {genderLabel(g)}
                </Text>
              </Pressable>
              );
            })}
          </View>

          <Text style={[styles.modalTitle, { color: toRgb(theme.colors['--text-primary']) }]}>{t('explore.filterAge')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['All', ...ageOptions].map((a) => {
              const isActive = filters.ageGroups?.length === 0 ? a === 'All' : filters.ageGroups?.includes(a);
              return (
              <Pressable
                key={a}
                onPress={() => applyFilter('age', a)}
                style={[
                  styles.chip,
                  {
                    borderColor: isActive ? toRgb(theme.colors['--brand-primary']) : toRgba(theme.colors['--border'], 0.3),
                    backgroundColor: isActive ? toRgba(theme.colors['--brand-primary'], 0.12) : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    color: isActive ? toRgb(theme.colors['--brand-primary']) : toRgb(theme.colors['--text-secondary']),
                    fontWeight: '600',
                  }}
                >
                  {ageLabel(a)}
                </Text>
              </Pressable>
              );
            })}
          </View>

          <Text style={[styles.modalTitle, { color: toRgb(theme.colors['--text-primary']) }]}>{t('explore.filterArchetype')}</Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {(['most', 'least'] as const).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => applyArchetype(opt)}
                style={[
                  styles.chip,
                  {
                    borderColor: filters.archetype === opt ? toRgb(theme.colors['--brand-primary']) : toRgba(theme.colors['--border'], 0.3),
                    backgroundColor: filters.archetype === opt ? toRgba(theme.colors['--brand-primary'], 0.12) : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    color: filters.archetype === opt ? toRgb(theme.colors['--brand-primary']) : toRgb(theme.colors['--text-secondary']),
                    fontWeight: '600',
                  }}
                >
                  {opt === 'most' ? t('explore.archetypeMost') : t('explore.archetypeLeast')}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 8 }}>{t('explore.filterNote')}</Text>
          <View style={{ height: 12 }} />
          <Button title={t('explore.applyFilters')} onPress={() => { setSettingsOpen(false); reset(); }} />
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
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  badge: { position: 'absolute', top: 40, padding: 10, borderRadius: 12, borderWidth: 2, borderColor: 'white', zIndex: 10 },
  actionBadge: { position: 'absolute', top: -24, padding: 10, borderRadius: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 6 },
});
