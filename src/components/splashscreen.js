import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { AppButton, COLORS, Page } from './native';

const splash = require('../../public/assets/splashscreen.png');
const musicBackground = require('../../public/assets/glowing-musical-pentagram-background-with-sound-notes_1017-31220.avif');

function SplashScreen({ onNavigate, playButtonSound = () => {} }) {
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.96)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(12)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const isStarting = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(imageOpacity, { toValue: 1, duration: 650, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(imageScale, { toValue: 1, speed: 8, bounciness: 3, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(250),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(contentY, { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();
  }, [imageOpacity, imageScale, contentOpacity, contentY]);

  const handleStart = () => {
    if (isStarting.current) return;
    isStarting.current = true;
    playButtonSound();
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.96, duration: 90, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(buttonScale, { toValue: 1, duration: 140, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 0.28, duration: 120, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(80),
    ]).start(() => onNavigate('mainmenu'));
  };

  return (
    <Page backgroundImage={musicBackground} overlayColor="rgba(1, 1, 58, 0.78)" style={{ justifyContent: 'center' }} contentStyle={{ maxWidth: 520 }}>
      <Animated.Image accessibilityLabel="KeyStrike" resizeMode="contain" source={splash} style={{ width: 1000, height: 900, marginBottom: -300, marginTop: -200, opacity: imageOpacity, transform: [{ scale: imageScale }] }} />
      <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
        <Text style={{ color: COLORS.muted, fontSize: 17, textAlign: 'center', marginBottom: 0 }}>Build your rhythm. Master the keys.</Text>
        <View style={{ position: 'relative', alignItems: 'center' }}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <AppButton title="Start!" onPress={handleStart} style={{ width: 300, alignSelf: 'center', minHeight: 60, backgroundColor: '#0a009b', borderWidth: 0, borderRadius: 12 }} textStyle={{ fontSize: 22 }} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, width: 300, height: 60, borderRadius: 12, backgroundColor: '#ecbf07', opacity: flashOpacity }} />
        </View>
      </Animated.View>
    </Page>
  );
}
export default SplashScreen;
