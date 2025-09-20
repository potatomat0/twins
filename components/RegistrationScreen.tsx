import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { RouteProp } from '@react-navigation/native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Dropdown, { DropdownHandle } from '@components/common/Dropdown';
import KeyboardDismissable from '@components/common/KeyboardDismissable';

type Nav = StackNavigationProp<RootStackParamList, 'Registration'>;
type Route = RouteProp<RootStackParamList, 'Registration'>;
type Props = { navigation: Nav; route: Route };

const ageGroups = ['<18', '18-24', '25-35', '35-44', '45+'];
const genders = ['Male', 'Female', 'Non-Binary', 'Prefer Not To Say'];

const RegistrationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [uFocus, setUFocus] = useState(false);
  const [eFocus, setEFocus] = useState(false);
  const [ageGroup, setAgeGroup] = useState('');
  const [gender, setGender] = useState('');
  const usernameRef = useRef<TextInput>(null as any);
  const emailRef = useRef<TextInput>(null as any);
  const ageRef = useRef<DropdownHandle>(null);
  const genderRef = useRef<DropdownHandle>(null);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const usernameValid = useMemo(() => username.trim().length >= 2, [username]);

  const canStart = usernameValid && emailValid && ageGroup && gender;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <KeyboardDismissable>
      <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>        
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ padding: 16, alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
      <Card>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>Welcome to Twins</Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>Let’s create your temporary profile</Text>

        <TextInput
          placeholder="How would you want to be called?"
          placeholderTextColor={toRgb(theme.colors['--text-muted'])}
          style={[
            styles.input,
            {
              backgroundColor: toRgb(theme.colors['--surface']),
              borderColor: uFocus ? toRgb(theme.colors['--focus']) : toRgba(theme.colors['--border'], 0.08),
              borderWidth: uFocus ? 2 : 1,
              color: toRgb(theme.colors['--text-primary']),
              shadowColor: toRgb(theme.colors['--focus']),
              shadowOpacity: uFocus ? 0.35 : 0,
              shadowRadius: uFocus ? 10 : 0,
              elevation: uFocus ? 4 : 0,
            },
          ]}
          value={username}
          onChangeText={setUsername}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus?.()}
          onFocus={() => setUFocus(true)}
          onBlur={() => setUFocus(false)}
        />
        {!usernameValid && username.length > 0 && (
          <Text style={styles.warn}>Username must be longer than 2 characters.</Text>
        )}

        <TextInput
          placeholder="Enter your email"
          placeholderTextColor={toRgb(theme.colors['--text-muted'])}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[
            styles.input,
            {
              backgroundColor: toRgb(theme.colors['--surface']),
              borderColor: eFocus ? toRgb(theme.colors['--focus']) : toRgba(theme.colors['--border'], 0.08),
              borderWidth: eFocus ? 2 : 1,
              color: toRgb(theme.colors['--text-primary']),
              shadowColor: toRgb(theme.colors['--focus']),
              shadowOpacity: eFocus ? 0.35 : 0,
              shadowRadius: eFocus ? 10 : 0,
              elevation: eFocus ? 4 : 0,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          ref={emailRef}
          returnKeyType="next"
          onSubmitEditing={() => ageRef.current?.open()}
          onFocus={() => setEFocus(true)}
          onBlur={() => setEFocus(false)}
        />
        {!emailValid && email.length > 0 && <Text style={styles.warn}>Please enter a valid email.</Text>}

        <Dropdown
          options={ageGroups}
          value={ageGroup}
          onChange={(v) => setAgeGroup(v)}
          placeholder="Choose your age group"
          ref={ageRef}
          onCommit={() => genderRef.current?.open()}
        />
        <Dropdown
          options={genders}
          value={gender}
          onChange={(v) => setGender(v)}
          placeholder="Choose your gender"
          ref={genderRef}
        />

        <Button
          title="Start Questionnaire"
          onPress={() => {
            const uname = username.trim();
            const mail = email.trim();
            navigation.navigate('Questionnaire', {
              username: uname,
              email: mail,
              ageGroup,
              gender,
            });
          }}
          disabled={!canStart}
          style={{ marginTop: 8 }}
        />
      </Card>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </KeyboardDismissable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  input: {
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  warn: { color: '#f59e0b', marginTop: -8, marginBottom: 8 },
});

export default RegistrationScreen;
