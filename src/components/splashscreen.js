import React from 'react';
import { Image, Text } from 'react-native';
import { AppButton, COLORS, Page } from './native';

const splash = require('../../public/assets/splashscreen.png');
const musicBackground = require('../../public/assets/glowing-musical-pentagram-background-with-sound-notes_1017-31220.avif');

function SplashScreen({ onNavigate }) {
  return (
    <Page
      backgroundImage={musicBackground}
      overlayColor="rgba(1, 1, 58, 0.78)"
      style={{ justifyContent: 'center' }}
      contentStyle={{ maxWidth: 520 }}
    >
      <Image
        accessibilityLabel="KeyStrike"
        resizeMode="contain"
        source={splash}
        style={{ width: 1000, height: 900, marginBottom: -300, marginTop: -200 }}
      />
      <Text style={{ color: COLORS.muted, fontSize: 17, textAlign: 'center', marginBottom: 0 }}>
        Build your rhythm. Master the keys.
      </Text>
      <AppButton
        title="Start!"
        onPress={() => onNavigate('mainmenu')}
        style={{ width: 300, alignSelf: 'center', minHeight: 60, backgroundColor: '#db9500', borderWidth: 0, borderRadius: 12 }}
        textStyle={{ fontSize: 22 }}
      />
    </Page>
  );
}

export default SplashScreen;
