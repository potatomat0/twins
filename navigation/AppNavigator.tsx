import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import RegistrationScreen from '@components/RegistrationScreen';
import QuestionnaireScreen from '@components/QuestionnaireScreen';
import ResultsScreen from '@components/ResultsScreen';
import CreateAccountScreen from '@components/CreateAccountScreen';
import LoginScreen from '@components/LoginScreen';
import SwipeHeader from '@components/common/SwipeHeader';
import DashboardScreen from '@components/DashboardScreen';
import ExploreScreen from '@components/ExploreScreen';
import ExploreSwipeScreen from '@components/ExploreSwipeScreen';
import UserSettingsScreen from '@components/UserSettingsScreen';
import PreQuizIntroScreen from '@components/PreQuizIntroScreen';
import QuizPrimerScreen from '@components/QuizPrimerScreen';
import ResumePromptScreen from '@components/ResumePromptScreen';
import type { ResumeDestination } from '@store/sessionStore';
import type { PcaFingerprint } from '@services/pcaEvaluator';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

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
};

const Stack = createStackNavigator<RootStackParamList>();
type TabParamList = {
  Explore: undefined;
  Graph: undefined;
  Settings: undefined;
  Test: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarStyle: { paddingBottom: 6, paddingTop: 6, height: 60 },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          const icon =
            route.name === 'Explore'
              ? 'compass'
              : route.name === 'Dashboard'
              ? 'stats-chart'
              : 'settings';
          return <Ionicons name={icon as any} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Graph" component={DashboardScreen} />
      <Tab.Screen name="Settings" component={UserSettingsScreen} />
      <Tab.Screen name="Test" component={ExploreScreen} />
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
