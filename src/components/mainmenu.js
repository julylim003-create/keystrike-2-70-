import React from 'react';
import { Text, View } from 'react-native';
import { BackButton, ImageActionButton, Page, styles } from './native';

const musicBackground = require('../../public/assets/glowing-musical-pentagram-background-with-sound-notes_1017-31220.avif');
const piano = require('../../public/assets/piano.png');
const achievements = require('../../public/assets/achievements.png');
const settings = require('../../public/assets/settings.png');
const profile = require('../../public/assets/profile.png');

function MainMenu({ onNavigate, isAuthenticated, playButtonSound = () => {} }) {
  const navigate = (screen) => { playButtonSound(); onNavigate(screen); };

  return (
    <Page backgroundImage={musicBackground} overlayColor="rgba(1, 1, 58, 0.8)" style={{ justifyContent: 'center' }} contentStyle={{ maxWidth: 420 }}>
      <BackButton onPress={() => navigate('splash')} />
      <Text style={[styles.title, { fontSize: 50 }]}>Main Menu</Text>
      <View style={{ width: '100%', maxWidth: 280, marginTop: 12 }}>
        <ImageActionButton title="Play" image={piano} tint="rgba(5, 224, 97, 0.78)" imageOpacity={0.2} onPress={() => navigate('playmenu')} />
        <ImageActionButton title="Stats" image={achievements} tint="rgba(214, 158, 3, 0.78)" imageOpacity={0.4} onPress={() => navigate('stats')} />
        <ImageActionButton title="Settings" image={settings} tint="rgba(3, 147, 214, 0.78)" imageOpacity={0.4} onPress={() => navigate('settings')} />
        <ImageActionButton title="Profile" image={profile} tint="rgba(255, 81, 0, 0.88)" imageOpacity={0.4} onPress={() => navigate('profile')} />
      </View>
      <Text style={[styles.subtitle, { fontSize: 13, marginTop: 10, marginBottom: 0 }]}>
        {isAuthenticated ? 'Signed in. Your stats sync to your account.' : 'Play as a guest; sign in only when you want to save progress.'}
      </Text>
    </Page>
  );
}
export default MainMenu;
