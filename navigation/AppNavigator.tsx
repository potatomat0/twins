import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import RegistrationScreen from '@components/RegistrationScreen';
import QuestionnaireScreen from '@components/QuestionnaireScreen';
import ResultsScreen from '@components/ResultsScreen';

export type RootStackParamList = {
  Registration: undefined;
  Questionnaire: { username: string; email: string; ageGroup: string; gender: string } | undefined;
  Results: { username: string; scores: Record<string, number> } | undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
      }}
    >
      <Stack.Screen name="Registration" component={RegistrationScreen} />
      <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;

