import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import NotificationModal from '@components/common/NotificationModal';
import KeyboardDismissable from '@components/common/KeyboardDismissable';

type Nav = StackNavigationProp<RootStackParamList, 'Login'>;
type Props = { navigation: Nav };

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailRef = useRef<TextInput>(null as any);
  const passwordRef = useRef<TextInput>(null as any);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const canLogin = emailValid && password.length >= 1;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <KeyboardDismissable>
      <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--dark-bg']) }]}>        
        <ScrollView
          contentContainerStyle={{ padding: 16, alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Card>
            <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>Sign in to continue</Text>

            <TextInput
              placeholder="Email"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              ref={emailRef}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus?.()}
            />
            {!emailValid && email.length > 0 && <Text style={styles.warn}>Please enter a valid email.</Text>}

            <TextInput
              placeholder="Password"
              placeholderTextColor="#888"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              ref={passwordRef}
              returnKeyType="done"
              onSubmitEditing={() => { if (canLogin) setModal(true); }}
            />

            <View style={{ height: 12 }} />
            <Button title="Login" onPress={() => setModal(true)} disabled={!canLogin} />

            <View style={{ height: 16 }} />
            <Text style={{ color: '#bbb', marginBottom: 8 }}>Or, start our personality quiz to start making an account</Text>
            <Button
              title="Start Personality Quiz"
              onPress={() => navigation.navigate('Questionnaire', { username: '', email, ageGroup: '', gender: '' })}
            />
          </Card>
        </ScrollView>

        <NotificationModal
          visible={modal}
          title="Not implemented"
          message="Login is mocked in this prototype. TODO: integrate Firebase Auth."
          primaryText="OK"
          onPrimary={() => setModal(false)}
          onRequestClose={() => setModal(false)}
        />
      </SafeAreaView>
    </KeyboardDismissable>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
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
