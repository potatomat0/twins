import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';

type Nav = StackNavigationProp<RootStackParamList, 'Registration'>;

type Props = { navigation: Nav };

const ageGroups = ['<18', '18-24', '25-35', '35-44', '45+'];
const genders = ['Male', 'Female', 'Non-Binary', 'Prefer Not To Say'];

const RegistrationScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [gender, setGender] = useState('');

  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const usernameValid = useMemo(() => username.trim().length >= 2, [username]);

  const canStart = usernameValid && emailValid && ageGroup && gender;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--dark-bg']) }]}>
      <Card>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>Welcome to Twins</Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>Let’s create your temporary profile</Text>

        <TextInput
          placeholder="How would you want to be called?"
          placeholderTextColor="#888"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
        />
        {!usernameValid && username.length > 0 && (
          <Text style={styles.warn}>Username must be longer than 2 characters.</Text>
        )}

        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        {!emailValid && email.length > 0 && <Text style={styles.warn}>Please enter a valid email.</Text>}

        <Dropdown
          options={ageGroups}
          value={ageGroup}
          onChange={setAgeGroup}
          placeholder="Select Your Age Group"
        />
        <Dropdown
          options={genders}
          value={gender}
          onChange={setGender}
          placeholder="Select Your Gender"
        />

        <Button
          title="Start Questionnaire"
          onPress={() =>
            navigation.navigate('Questionnaire', {
              username: username.trim(),
              email: email.trim(),
              ageGroup,
              gender,
            })
          }
          disabled={!canStart}
          style={{ marginTop: 8 }}
        />
      </Card>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  input: {
    backgroundColor: '#191a1f',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  warn: { color: '#f59e0b', marginTop: -8, marginBottom: 8 },
});

export default RegistrationScreen;
