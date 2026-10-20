import React, { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { queueGameResultForSaving } from '../achievements';
import { AppButton, COLORS, styles } from './native';

function AccountSavePrompt({ mode, result, onNavigate, onDismiss }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const saveWithAccount = async (screen) => {
    setSaving(true);
    setError('');
    try {
      await queueGameResultForSaving(mode, result);
      onNavigate(screen);
    } catch (queueError) {
      setError(queueError.message || 'Could not queue this result for account sync.');
      setSaving(false);
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0, 0, 0, 0.72)' }}>
        <View style={[styles.card, {
          maxWidth: 340,
          alignSelf: 'center',
          borderRadius: 8,
          borderColor: 'rgba(255, 255, 255, 0.4)',
          backgroundColor: '#091849',
          padding: 24,
        }]}>
          <Text style={{ color: COLORS.primary, fontFamily: 'Georgia', fontSize: 24, fontWeight: '700', textAlign: 'center' }}>
            Save your progress?
          </Text>
          <Text style={{ color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginVertical: 14 }}>
            Create an account or sign in to keep this score, your history, and achievements.
          </Text>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <AppButton
            title="Sign in"
            disabled={saving}
            onPress={() => saveWithAccount('login')}
            style={{ backgroundColor: '#ffd35b', borderColor: '#ffd35b' }}
            textStyle={{ color: '#171717' }}
          />
          <AppButton title="Create account" disabled={saving} onPress={() => saveWithAccount('signup')} secondary />
          <AppButton
            title="Continue without saving"
            disabled={saving}
            onPress={onDismiss}
            secondary
            style={{ borderColor: 'transparent', backgroundColor: 'transparent' }}
            textStyle={{ color: 'rgba(255,255,255,0.7)', fontWeight: '400' }}
          />
        </View>
      </View>
    </Modal>
  );
}

export default AccountSavePrompt;
