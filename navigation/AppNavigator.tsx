import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import RegistrationScreen from '@components/RegistrationScreen';
import QuestionnaireScreen from '@components/QuestionnaireScreen';
import ResultsScreen from '@components/ResultsScreen';
import Step2IntroScreen from '@components/Step2IntroScreen';
import Step2QuestionnaireScreen from '@components/Step2QuestionnaireScreen';
import Step2ResultsScreen from '@components/Step2ResultsScreen';
import CreateAccountScreen from '@components/CreateAccountScreen';
import LoginScreen from '@components/LoginScreen';
import SwipeHeader from '@components/common/SwipeHeader';
import { useAuth } from '@context/AuthContext';
import ExploreScreen from '@components/ExploreScreen';
import ExploreSwipeScreen from '@components/ExploreSwipeScreen';
import UserSettingsScreen from '@components/UserSettingsScreen';
import MatchesScreen from '@components/MatchesScreen';
import ChatScreen from '@components/ChatScreen';
import MessagesScreen from '@components/MessagesScreen';
import PreQuizIntroScreen from '@components/PreQuizIntroScreen';
import QuizPrimerScreen from '@components/QuizPrimerScreen';
import ResumePromptScreen from '@components/ResumePromptScreen';
import type { ResumeDestination } from '@store/sessionStore';
import type { PcaFingerprint } from '@services/pcaEvaluator';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from '@context/LocaleContext';
import { RecommendationProvider } from '@context/RecommendationContext';

export type RootStackParamList = {
  Login: undefined;
  QuizIntro: { email?: string } | undefined;
  Registration: { email?: string } | undefined;
  QuizPrimer: { username: string; email: string; ageGroup: string; gender: string };
  Questionnaire: { username: string; email: string; ageGroup: string; gender: string } | undefined;
  Results: {
    username: string;
    email: string;
    ageGroup: string;
    gender: string;
    scores: Record<string, number>;
    pcaFingerprint?: PcaFingerprint;
  } | undefined;
  Character: {
    username: string;
    email: string;
    ageGroup: string;
    gender: string;
    scores: Record<string, number>;
    pcaFingerprint?: PcaFingerprint;
  } | undefined;
  Step2Intro: {
    username: string;
    email: string;
    ageGroup: string;
    gender: string;
    scores: Record<string, number>;
    pcaFingerprint?: PcaFingerprint;
  } | undefined;
  Step2Questionnaire: {
    username: string;
    email: string;
    ageGroup: string;
    gender: string;
    scores: Record<string, number>;
    pcaFingerprint?: PcaFingerprint;
  } | undefined;
  Step2Results: {
    username: string;
    email: string;
    ageGroup: string;
    gender: string;
    scores: Record<string, number>;
    pcaFingerprint?: PcaFingerprint;
    step2Answers?: Record<string, 0 | 1>;
    step2Vector?: number[];
  } | undefined;
  CreateAccount: {
    username: string;
    email: string;
    ageGroup: string;
    gender: string;
    scores: Record<string, number>;
    pcaFingerprint?: PcaFingerprint;
    step2Answers?: Record<string, 0 | 1>;
    step2Vector?: number[];
  } | undefined;
  ResumePrompt: { destination: ResumeDestination | null } | undefined;
  VerifyEmail: {
    email: string;
    password: string;
    username: string;
    ageGroup: string;
    gender: string;
    scores: Record<string, number>;
    pcaFingerprint?: PcaFingerprint;
    origin?: 'signup' | 'login';
  } | undefined;
  Dashboard: { username: string; email: string; scores?: Record<string, number> } | undefined;
  Chat: {
    matchId: string;
    peerId: string;
    peerName: string | null;
    peerAvatar?: string | null;
    notificationId?: string | null;
  };
};

const Stack = createStackNavigator<RootStackParamList>();
type TabParamList = {
  Explore: undefined;
  Settings: undefined;
  Test: undefined;
  Matches: undefined;
  Messages: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

import { useNotificationStore } from '@store/notificationStore';
import { useMessagesStore } from '@store/messagesStore';

import { realtimeManager } from '@services/RealtimeManager';
import { useAudioPlayer } from 'expo-audio';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});

const MainTabs: React.FC = () => {
  const { user } = useAuth();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const messagesUnread = useMessagesStore((s) => s.threads.some((t) => t.hasUnread));
  const initNotis = useNotificationStore((s) => s.initialize);
  const resetNotis = useNotificationStore((s) => s.reset);
  const initMessages = useMessagesStore((s) => s.initialize);
  const resetMessages = useMessagesStore((s) => s.reset);
  
  // Audio setup
  const popSound = useAudioPlayer(require('../assets/sound/pop.mp3'));

  // Initialize stores on auth, reset on logout
  React.useEffect(() => {
    if (user?.id) {
      void initNotis(user.id);
      void initMessages(user.id);
      
      // Register sound callback
      realtimeManager.setPlaySoundCallback(() => {
        try {
            popSound.seekTo(0);
            popSound.play();
        } catch {}
      });
      
      realtimeManager.connect(user.id);
    } else {
      realtimeManager.disconnect();
      resetNotis();
      resetMessages();
    }
  }, [user?.id, initNotis, initMessages, resetNotis, resetMessages, popSound]);

  const { t } = useTranslation();
  const showBadge = unreadCount > 0;
  return (
    <SafeAreaView style={styles.safeArea}>
      <Tab.Navigator
        screenOptions={({ route }: any) => ({
          headerShown: false,
          tabBarStyle: { paddingBottom: 6, paddingTop: 6, height: 60 },
          tabBarIcon: ({ color, size }: { color: string; size: number }) => {
            const icon =
              route.name === 'Explore'
                ? 'compass'
                : route.name === 'Settings'
                ? 'settings'
                : route.name === 'Messages'
                ? 'chatbox'
                : route.name === 'Matches'
                ? 'notifications'
                : 'construct';
            return <Ionicons name={icon as any} color={color} size={size} />;
          },
          tabBarBadge: route.name === 'Messages' && messagesUnread ? '•' : route.name === 'Matches' && showBadge ? '•' : undefined,
          tabBarBadgeStyle:
            route.name === 'Messages' && messagesUnread
              ? { backgroundColor: 'red' }
              : undefined,
          tabBarLabel: ({ color, focused }: { color: string; focused: boolean }) => {
            const key =
              route.name === 'Explore'
                ? 'explore.title'
                : route.name === 'Matches'
                ? 'notifications.title'
                : route.name === 'Messages'
                ? 'messages.title'
                : route.name === 'Settings'
                ? 'settings.accordion.profile'
                : route.name;
            return (
              <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500' }}>
                {t(key)}
              </Text>
            );
          },
        })}
      >
        <Tab.Screen name="Explore" component={ExploreSwipeScreen as any} />
        <Tab.Screen name="Matches" component={MatchesScreen as any} />
        <Tab.Screen name="Messages" component={MessagesScreen as any} />
        <Tab.Screen name="Settings" component={UserSettingsScreen as any} />
        <Tab.Screen name="Test" component={ExploreScreen as any} />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

const AppNavigator = () => {
  return (
    <RecommendationProvider>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="QuizIntro"
          component={PreQuizIntroScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Registration"
          component={RegistrationScreen}
          options={({ navigation }) => ({
            headerShown: true,
            gestureEnabled: false,
            header: () => <SwipeHeader title="Registration" onBack={() => navigation.goBack()} />,
          })}
        />
        <Stack.Screen
          name="QuizPrimer"
          component={QuizPrimerScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="ResumePrompt"
          component={ResumePromptScreen}
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Questionnaire"
          component={QuestionnaireScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={({ navigation }) => ({
            headerShown: true,
            gestureEnabled: false,
            header: () => <SwipeHeader title="Results" onBack={() => navigation.goBack()} />,
          })}
        />
        <Stack.Screen
          name="Character"
          component={require('@components/CharacterScreen').default}
          options={({ navigation }) => ({
            headerShown: true,
            gestureEnabled: false,
            header: () => <SwipeHeader title="Your Character" onBack={() => navigation.goBack()} />,
          })}
        />
        <Stack.Screen
          name="Step2Intro"
          component={Step2IntroScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Step2Questionnaire"
          component={Step2QuestionnaireScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Step2Results"
          component={Step2ResultsScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="CreateAccount"
          component={CreateAccountScreen}
          options={({ navigation }) => ({
            headerShown: true,
            gestureEnabled: false,
            header: () => <SwipeHeader title="Create Account" onBack={() => navigation.goBack()} />,
          })}
        />
        <Stack.Screen name="Chat" component={ChatScreen as any} />
        <Stack.Screen name="Dashboard" component={MainTabs} />
        <Stack.Screen
          name="VerifyEmail"
          component={require('@components/VerifyEmailScreen').default}
          options={({ navigation }) => ({
            headerShown: true,
            gestureEnabled: false,
            header: () => <SwipeHeader title="Verify Email" onBack={() => navigation.goBack()} />,
          })}
        />
      </Stack.Navigator>
    </RecommendationProvider>
  );
};

export default AppNavigator;
