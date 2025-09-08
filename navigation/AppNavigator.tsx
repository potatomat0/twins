import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import RegistrationScreen from '@components/RegistrationScreen';
import QuestionnaireScreen from '@components/QuestionnaireScreen';
import ResultsScreen from '@components/ResultsScreen';
import CreateAccountScreen from '@components/CreateAccountScreen';
import LoginScreen from '@components/LoginScreen';
import SwipeHeader from '@components/common/SwipeHeader';

export type RootStackParamList = {
  Login: undefined;
  Registration: undefined;
  Questionnaire: { username: string; email: string; ageGroup: string; gender: string } | undefined;
  Results: { username: string; email: string; ageGroup: string; gender: string; scores: Record<string, number> } | undefined;
  CreateAccount: { username: string; email: string; ageGroup: string; gender: string; scores: Record<string, number> } | undefined;
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
      <Stack.Screen name="Registration" component={RegistrationScreen} />
      <Stack.Screen
        name="Questionnaire"
        component={QuestionnaireScreen}
        options={({ navigation }) => ({
          headerShown: false,
          header: () => <SwipeHeader title="Personality Questionnaire" onBack={() => navigation.goBack()} />,
        })}
      />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
