import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import RegistrationScreen from '@components/RegistrationScreen';
import QuestionnaireScreen from '@components/QuestionnaireScreen';
import ResultsScreen from '@components/ResultsScreen';
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
import useNotifications from '@hooks/useNotifications';

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
  CreateAccount: {
    username: string;
    email: string;
    ageGroup: string;
    gender: string;
    scores: Record<string, number>;
    pcaFingerprint?: PcaFingerprint;
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

const MainTabs: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications(user?.id, { enabled: true, limit: 50 });
  const showBadge = unreadCount > 0;
  return (
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
        tabBarBadge: route.name === 'Matches' && showBadge ? '•' : undefined,
      })}
    >
      <Tab.Screen name="Explore" component={ExploreSwipeScreen as any} />
      <Tab.Screen name="Matches" component={MatchesScreen as any} />
      <Tab.Screen name="Messages" component={MessagesScreen as any} />
      <Tab.Screen name="Settings" component={UserSettingsScreen as any} />
      <Tab.Screen name="Test" component={ExploreScreen as any} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
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
  );
};

export default AppNavigator;
