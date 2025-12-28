import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, TextInput, View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useAuth } from '@context/AuthContext';
import supabase from '@services/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '@context/LocaleContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMessagesStore } from '@store/messagesStore';
import { useNotificationStore } from '@store/notificationStore';

type ChatRoute = RouteProp<
  {
    Chat: {
      matchId: string;
      peerId: string;
      peerName: string | null;
      peerAvatar?: string | null;
      notificationId?: string | null;
    };
  },
  'Chat'
>;

type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  status?: 'sending' | 'sent' | 'delivered' | 'seen' | 'error';
};

const ChatScreen: React.FC = () => {
  const { params } = useRoute<ChatRoute>();
  const { matchId, peerId, peerName: routePeerName, peerAvatar, notificationId } = params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const nav = useNavigation();
  const { t } = useTranslation();
  
  const updateThread = useMessagesStore((s) => s.updateThread);
  const markRead = useMessagesStore((s) => s.markRead);
  const markMessageNotisRead = useNotificationStore((s) => s.markMessagesFromActorRead);
  const markNotificationIdsRead = useNotificationStore((s) => s.markRead);
  
  const [peerName, setPeerName] = useState<string | null>(routePeerName ?? null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [expandedMeta, setExpandedMeta] = useState<Set<string>>(new Set());
  const listRef = useRef<FlatList<MessageRow>>(null);
  const CACHE_KEY = `messages:${user?.id ?? 'anon'}:${matchId}`;

  useEffect(() => {
    nav.setOptions?.({
      headerShown: true,
      headerTitle: peerName ?? 'Chat',
      headerTintColor: toRgb(theme.colors['--text-primary']),
      headerStyle: { backgroundColor: toRgb(theme.colors['--bg']) },
    });
  }, [nav, peerName, theme.colors]);

  useEffect(() => {
    if (!peerName) {
      (async () => {
        const { data, error } = await supabase
          .from('profile_lookup')
          .select('username')
          .eq('id', peerId)
          .maybeSingle();
        if (data?.username) {
          setPeerName(data.username);
          setProfileLoaded(true);
        } else if (__DEV__ && error) {
          console.warn('[chat] profile lookup error', error);
        }
      })();
    }
  }, [peerId, peerName]);

  const loadMessages = useCallback(async () => {
    if (!matchId) return;
    // from cache first
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as MessageRow[];
        setMessages(parsed);
      } catch {
        // ignore parse errors
      }
    }
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, body, created_at, status')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setMessages(data);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      // Mark incoming as delivered
      const inboundIds = data.filter((m) => m.receiver_id === user?.id && m.status !== 'seen').map((m) => m.id);
      if (inboundIds.length) {
        await supabase.from('messages').update({ status: 'delivered' }).in('id', inboundIds);
      }
      const unseen = data.filter((m) => m.receiver_id === user?.id && m.status !== 'seen').map((m) => m.id);
      if (unseen.length) {
        await supabase.from('messages').update({ status: 'seen' }).in('id', unseen);
        // Optimistic store update
        markRead(matchId);
      }
    } else if (__DEV__ && error) {
      console.warn('[chat] load error', error);
    }
  }, [matchId, markRead]);

  useEffect(() => {
    void loadMessages();
    // On thread open, mark all inbound as seen
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('id')
        .eq('match_id', matchId)
        .eq('receiver_id', user?.id ?? '')
        .neq('status', 'seen');
      const ids = (data ?? []).map((m: any) => m.id);
      if (ids.length) {
        await supabase.from('messages').update({ status: 'seen' }).in('id', ids);
        markRead(matchId); // Update store so badges clear immediately
        // Also clear related message notifications for this sender
        void markMessageNotisRead(peerId);
      }
      // If we arrived here via a specific notification, mark it read too
      if (notificationId) {
        void markNotificationIdsRead([notificationId]);
      }
    })();

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const incoming = payload.new as MessageRow;
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === incoming.id);
            if (exists) return prev.map((m) => (m.id === incoming.id ? incoming : m));
            return [...prev, incoming];
          });
          setTimeout(() => {
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify((prev: any) => prev)).catch(() => {});
          }, 0);
          if (incoming.receiver_id === user?.id) {
            void supabase.from('messages').update({ status: 'seen' }).eq('id', incoming.id);
            markRead(matchId);
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const updated = payload.new as MessageRow;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          // if an incoming message gets updated to seen and it's ours, reflect it
          setTimeout(() => {
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify((prev: any) => prev)).catch(() => {});
          }, 0);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, loadMessages, markRead]);

  const send = async () => {
    if (!input.trim() || !user?.id) return;
    setSending(true);
    const tempId = `local-${Date.now()}`;
    const optimistic: MessageRow = {
      id: tempId,
      sender_id: user.id,
      receiver_id: peerId,
      body: input.trim(),
      created_at: new Date().toISOString(),
      status: 'sending',
    };
    
    // Update store immediately
    updateThread(matchId, {
      lastMessage: input.trim(),
      lastAt: new Date().toISOString(),
      hasUnread: false // sent by me
    });

    setMessages((prev) => [...prev, optimistic]);
    try {
      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: user.id,
        receiver_id: peerId,
        body: input.trim(),
      });
      if (error) {
        if (__DEV__) console.warn('[chat] send error', error);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'error' } : m)));
      } else {
        setInput('');
        // refresh last row to get real id/status
        void loadMessages();
      }
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: MessageRow }) => {
    const mine = item.sender_id === user?.id;
    const status = mine ? item.status ?? 'sent' : undefined;
    const created = new Date(item.created_at);
    const index = messages.findIndex((m) => m.id === item.id);
    const prev = index > 0 ? messages[index - 1] : null;
    const prevDate = prev ? new Date(prev.created_at) : null;
    const gap = prevDate ? (created.getTime() - prevDate.getTime()) / 60000 : Infinity;
    const newSession = !prevDate || gap > 10 || created.toDateString() !== prevDate.toDateString();
    const isLastInSession = (() => {
      const next = index < messages.length - 1 ? messages[index + 1] : null;
      if (!next) return true;
      const nextDate = new Date(next.created_at);
      const diff = (nextDate.getTime() - created.getTime()) / 60000;
      return diff > 10 || nextDate.toDateString() !== created.toDateString();
    })();
    const showMeta = isLastInSession || expandedMeta.has(item.id);

    return (
      <View>
        {newSession ? (
          <View style={[styles.sessionHeader, { paddingVertical: 12 }]}>
            <Text style={{ color: toRgb(theme.colors['--text-muted']), fontSize: 12, textAlign: 'center', marginBottom: 6 }}>
              {created.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}{' '}
              {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <View style={{ height: 1, backgroundColor: toRgba(theme.colors['--border'], 0.4), marginHorizontal: 16 }} />
          </View>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (!isLastInSession) {
              setExpandedMeta((prev) => {
                const next = new Set(prev);
                if (next.has(item.id)) next.delete(item.id);
                else next.add(item.id);
                return next;
              });
            }
          }}
        >
          <View
            style={[
              styles.bubble,
              {
                alignSelf: mine ? 'flex-end' : 'flex-start',
                backgroundColor: mine ? toRgb(theme.colors['--brand-primary']) : toRgb(theme.colors['--surface']),
                borderColor: toRgba(theme.colors['--border'], 0.12),
              },
            ]}
          >
            <Text style={{ color: mine ? '#fff' : toRgb(theme.colors['--text-primary']) }}>{item.body}</Text>
            {showMeta ? (
              <View style={styles.metaRow}>
                <Ionicons
                  name={
                    status === 'error'
                      ? 'alert-circle-outline'
                      : status === 'seen'
                      ? 'checkmark-done-outline'
                      : status === 'delivered'
                      ? 'checkmark-outline'
                      : status === 'sending'
                      ? 'time-outline'
                      : 'checkmark-outline'
                  }
                  size={14}
                  color={
                    status === 'error'
                      ? toRgb(theme.colors['--accent-orange'] ?? '#f97316')
                      : toRgb(theme.colors['--text-secondary'])
                  }
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.time}>
                  {status === 'sending'
                    ? 'Sending'
                    : status === 'error'
                    ? 'Send failed'
                    : status === 'delivered'
                    ? 'Delivered'
                    : status === 'seen'
                    ? 'Seen'
                    : 'Sent'}
                  {' · '}
                  {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const empty = (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Ionicons name="chatbubble-ellipses-outline" size={28} color={toRgb(theme.colors['--text-muted'])} />
      <Text style={{ color: toRgb(theme.colors['--text-muted']), marginTop: 8, textAlign: 'center' }}>
        Start the conversation to get to know each other.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={{ flex: 1 }}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={empty}
          ref={listRef}
          onContentSizeChange={() => {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
          }}
          onLayout={() => {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
          }}
        />
        <View style={[styles.inputRow, { borderColor: toRgba(theme.colors['--border'], 0.18), backgroundColor: toRgb(theme.colors['--surface']) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message…"
            placeholderTextColor={toRgb(theme.colors['--text-muted'])}
            style={[styles.input, { color: toRgb(theme.colors['--text-primary']) }]}
            editable={!sending}
          />
          <Pressable onPress={send} disabled={sending || !input.trim()} style={{ padding: 8 }}>
            <Ionicons
              name="send"
              size={22}
              color={sending || !input.trim() ? toRgb(theme.colors['--text-muted']) : toRgb(theme.colors['--brand-primary'])}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubble: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '80%', borderWidth: 1 },
  time: { fontSize: 10, color: '#dfe3e8', marginTop: 4, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
  input: { flex: 1, paddingVertical: 8, paddingHorizontal: 10 },
  sessionHeader: { paddingVertical: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
});
