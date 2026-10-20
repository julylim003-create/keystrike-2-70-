import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View, Platform } from 'react-native';
import { GoogleAuthProvider, sendPasswordResetEmail, signInWithCredential, updateProfile } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { getAuthReturnScreen } from '../achievements';
import { auth } from '../firebase';
import { AppButton, BackButton, COLORS, Page, styles } from './native';

WebBrowser.maybeCompleteAuthSession();

function GoogleSignInButton({
  clientIds,
  disabled,
  name,
  showName,
  onNavigate,
  onError,
  setLoading,
}) {
  const nameRef = React.useRef(name);
  nameRef.current = name;
  const [request, response, promptAsync] = Google.useAuthRequest(clientIds);

  useEffect(() => {
    if (!response) return;

    if (response.type === 'error') {
      onError(response.error?.message || 'Google sign-in was not completed.');
      setLoading(false);
      return;
    }

    if (response.type !== 'success') return;

    const finishGoogleSignIn = async () => {
      setLoading(true);
      try {
        const { idToken, accessToken } = response.authentication || {};
        if (!idToken && !accessToken) {
          throw new Error('Google did not return an authentication token.');
        }
        const credential = GoogleAuthProvider.credential(idToken || null, accessToken);
        const result = await signInWithCredential(auth, credential);
        if (showName && nameRef.current.trim() && !result.user.displayName) {
          await updateProfile(result.user, { displayName: nameRef.current.trim() });
        }
        onNavigate(await getAuthReturnScreen());
      } catch (signInError) {
        onError(signInError.message || 'Google sign-in failed.');
      } finally {
        setLoading(false);
      }
    };

    finishGoogleSignIn();
  }, [response, showName, onNavigate, onError, setLoading]);

  const handlePress = async () => {
    if (!request) {
      onError('Google sign-in is still initializing. Try again in a moment.');
      return;
    }
    onError('');
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type !== 'success') setLoading(false);
    } catch (promptError) {
      onError(promptError.message || 'Unable to start Google sign-in.');
      setLoading(false);
    }
  };

  return (
    <AppButton
      title="Continue with Google"
      onPress={handlePress}
      secondary
      disabled={disabled}
    />
  );
}

function AuthForm({
  title,
  subtitle,
  submitLabel,
  onNavigate,
  onSubmit,
  footerText,
  footerAction,
  footerScreen,
  showName = false,
  showForgotPassword = false,
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const clientIds = {
    webClientId: googleClientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  };
  const platformClientId = Platform.OS === 'ios'
    ? clientIds.iosClientId
    : Platform.OS === 'android'
      ? clientIds.androidClientId
      : clientIds.webClientId;
  const handleGoogleError = React.useCallback((message) => setError(message), []);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await onSubmit({ name, email: email.trim(), password });
      onNavigate(await getAuthReturnScreen());
    } catch (submitError) {
      setError(
        submitError.code === 'auth/invalid-credential'
          ? 'The email or password is incorrect.'
          : submitError.code === 'auth/email-already-in-use'
            ? 'An account already exists for this email.'
            : submitError.message || 'Unable to complete sign-in.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError('Password reset instructions have been sent to your email.');
    } catch (resetError) {
      setError(resetError.message || 'Unable to send password reset instructions.');
    }
  };

  return (
    <Page>
      <BackButton onPress={() => onNavigate('splash')} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {showName && (
        <TextInput
          accessibilityLabel="Name"
          autoCapitalize="words"
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor="#667085"
          style={styles.field}
          value={name}
        />
      )}
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#667085"
        style={styles.field}
        value={email}
      />
      <TextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoComplete={showName ? 'new-password' : 'current-password'}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#667085"
        secureTextEntry
        style={styles.field}
        value={password}
      />
      {showForgotPassword && (
        <Pressable onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', padding: 8 }}>
          <Text style={{ color: COLORS.primary }}>Forgot Password?</Text>
        </Pressable>
      )}
      <AppButton title={loading ? 'Please wait...' : submitLabel} onPress={handleSubmit} disabled={loading} />
      <Text style={{ color: COLORS.muted, marginVertical: 13 }}>────────  Or  ────────</Text>
      {platformClientId ? (
        <GoogleSignInButton
          clientIds={clientIds}
          disabled={loading}
          name={name}
          showName={showName}
          onNavigate={onNavigate}
          onError={handleGoogleError}
          setLoading={setLoading}
        />
      ) : (
        <AppButton
          title="Continue with Google"
          onPress={() => setError(`Google sign-in needs EXPO_PUBLIC_GOOGLE_${Platform.OS.toUpperCase()}_CLIENT_ID in your environment.`)}
          secondary
          disabled={loading}
        />
      )}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22 }}>
        <Text style={{ color: COLORS.muted }}>{footerText} </Text>
        <Pressable onPress={() => onNavigate(footerScreen)}>
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{footerAction}</Text>
        </Pressable>
      </View>
    </Page>
  );
}

export default AuthForm;
