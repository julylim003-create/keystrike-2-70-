import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { Switch, Text, View } from 'react-native';
import { auth } from '../firebase';
import { AppButton, BackButton, COLORS, Page, styles } from './native';

function Settings({ onNavigate, isAuthenticated }) {
  const [soundEffects, setSoundEffects] = useState(true);
  const [music, setMusic] = useState(true);
  const [error, setError] = useState('');

  const handleSignOut = async () => {
    setError('');
    try {
      await signOut(auth);
      onNavigate('splash');
    } catch (signOutError) {
      setError(signOutError.message || 'Unable to sign out.');
    }
  };

  const renderSetting = (label, value, onValueChange) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
      <Text style={{ color: COLORS.text, fontSize: 16 }}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        onValueChange={onValueChange}
        thumbColor={value ? COLORS.primary : '#a9b1d2'}
        trackColor={{ false: '#3a4261', true: '#24566a' }}
        value={value}
      />
    </View>
  );

  return (
    <Page>
      <BackButton onPress={() => onNavigate('mainmenu')} />
      <Text style={styles.title}>Settings</Text>
      <View style={styles.card}>
        {renderSetting('Sound effects', soundEffects, setSoundEffects)}
        {renderSetting('Music', music, setMusic)}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isAuthenticated ? (
        <AppButton title="Sign Out" onPress={handleSignOut} secondary />
      ) : (
        <>
          <AppButton title="Sign in to record stats" onPress={() => onNavigate('login')} />
          <AppButton title="Create an account" onPress={() => onNavigate('signup')} secondary />
        </>
      )}
    </Page>
  );
}

export default Settings;
