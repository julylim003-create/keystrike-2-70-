import React from 'react';
import { Image, Text, View } from 'react-native';
import { AppButton, BackButton, Page, styles } from './native';

const minigame = require('../../public/assets/minigame.png');
const splashscreen = require('../../public/assets/pianomanlogo.png');

function GameCard1({ title, description, onPress }) {
  return (
    <View style={[styles.card, {
      alignItems: 'center',
      backgroundColor: '#db9500',
      borderColor: '#010172',
      borderRadius: 18,
      padding: 18,
    }]}>
      <View style={{ width: '100%', height: 130, overflow: 'hidden', borderRadius: 14, backgroundColor: '#000000' }}>
        <Image source={minigame} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      </View>
      <Text style={{ color: '#010172', fontFamily: 'Georgia', fontSize: 28, fontStyle: 'italic', fontWeight: '700', marginTop: 9, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ color: '#010172', fontSize: 16, lineHeight: 22, marginVertical: 8, textAlign: 'center' }}>{description}</Text>
      <AppButton
        title="Play"
        onPress={onPress}
        style={{ width: 150, alignSelf: 'center', backgroundColor: '#010172', borderWidth: 0 }}
      />
    </View>
  );
}

function GameCard2 ({ title, description, onPress }) {
  return (
    <View style={[styles.card, {
      alignItems: 'center',
      backgroundColor: '#db9500',
      borderColor: '#010172',
      borderRadius: 18,
      padding: 18,
    }]}>
      <View style={{ width: '100%', height: 130, overflow: 'hidden', borderRadius: 14, backgroundColor: '#000000' }}>
        <Image source={splashscreen} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      </View>
      <Text style={{ color: '#010172', fontFamily: 'Georgia', fontSize: 28, fontStyle: 'italic', fontWeight: '700', marginTop: 9, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ color: '#010172', fontSize: 16, lineHeight: 22, marginVertical: 8, textAlign: 'center' }}>{description}</Text>
      <AppButton
        title="Play"
        onPress={onPress}
        style={{ width: 150, alignSelf: 'center', backgroundColor: '#010172', borderWidth: 0 }}
      />
    </View>
  );
}

function Minigame({ onNavigate }) {
  return (
    <Page style={{ justifyContent: 'center' }} contentStyle={{ maxWidth: 400 }}>
      <BackButton onPress={() => onNavigate('mainmenu')} />
      <Text style={[styles.title, { fontSize: 34, marginTop: 70, }]}>Welcome to the Minigame!</Text>
      <Text style={styles.subtitle}>Get ready to test your skills and have fun!</Text>
      <GameCard1
        title="Tower Defense"
        description="Defend your tower with the power of music."
        onPress={() => onNavigate('towerdefense')}
      />
      <GameCard2
        title="Piano Man"
        description="Match the falling notes to the beat."
        onPress={() => onNavigate('pianoman')}
      />
    </Page>
  );
}

export default Minigame;
