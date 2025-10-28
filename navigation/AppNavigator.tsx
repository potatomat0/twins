import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import RegistrationScreen from '@components/RegistrationScreen';
import QuestionnaireScreen from '@components/QuestionnaireScreen';
import ResultsScreen from '@components/ResultsScreen';
import CreateAccountScreen from '@components/CreateAccountScreen';
import LoginScreen from '@components/LoginScreen';
import SwipeHeader from '@components/common/SwipeHeader';
import DashboardScreen from '@components/DashboardScreen';
import PreQuizIntroScreen from '@components/PreQuizIntroScreen';
import QuizPrimerScreen from '@components/QuizPrimerScreen';

export type RootStackParamList = {
  Login: undefined;
  QuizIntro: { email?: string } | undefined;
  Registration: { email?: string } | undefined;
  QuizPrimer: { username: string; email: string; ageGroup: string; gender: string };
  Questionnaire: { username: string; email: string; ageGroup: string; gender: string } | undefined;
  Results: { username: string; email: string; ageGroup: string; gender: string; scores: Record<string, number> } | undefined;
  Character: { username: string; email: string; ageGroup: string; gender: string; scores: Record<string, number> } | undefined;
  CreateAccount: { username: string; email: string; ageGroup: string; gender: string; scores: Record<string, number> } | undefined;
  VerifyEmail: {
    email: string;
    password: string;
    username: string;
    ageGroup: string;
    gender: string;
    scores: Record<string, number>;
    origin?: 'signup' | 'login';
  } | undefined;
  Dashboard: { username: string; email: string } | undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

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
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
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
