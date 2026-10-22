import React from 'react';
import { Text, View } from 'react-native';
import { BackButton, ImageActionButton, Page, styles } from './native';

const musicBackground = require('../../public/assets/glowing-musical-pentagram-background-with-sound-notes_1017-31220.avif');
const piano = require('../../public/assets/piano.png');
const achievements = require('../../public/assets/achievements.png');
const minigame = require('../../public/assets/minigame.png');

function PlayMenu({ onNavigate, playButtonSound = () => {} }) {
  const navigate = (screen) => {
    playButtonSound();
    onNavigate(screen);
  };
  return (
    <Page backgroundImage={musicBackground} overlayColor="rgba(1, 1, 58, 0.8)" style={{ justifyContent: 'center' }} contentStyle={{ maxWidth: 420 }}>
      <BackButton onPress={() => navigate('mainmenu')} />
      <Text style={[styles.title, { fontSize: 46, marginBottom: 16 }]}>Play Menu</Text>
      <View style={{ width: '100%', maxWidth: 280, gap: 8 }}>
        <ImageActionButton title="Music Lesson" image={piano} tint="rgba(5, 224, 97, 0.78)" imageOpacity={0.2} onPress={() => navigate('musiclesson')} />
        <ImageActionButton title="Goal" image={achievements} tint="rgba(214, 158, 3, 0.78)" imageOpacity={0.4} onPress={() => navigate('goal')} />
        <ImageActionButton title="MINIGAME" image={minigame} tint="#087eaa" imageOpacity={0.25} onPress={() => navigate('minigame')} />
      </View>
    </Page>
  );
}
export default PlayMenu;
