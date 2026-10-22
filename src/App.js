import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAudioPlayer } from 'expo-audio';
import { onAuthStateChanged } from 'firebase/auth';
import { flushPendingGameResults } from './achievements';
import { auth } from './firebase';
import SplashScreen from './components/splashscreen';
import Login from './components/login';
import Signup from './components/signup';
import MainMenu from './components/mainmenu';
import PlayMenu from './components/playmenu';
import Settings from './components/settings';
import Minigame from './components/minigame';
import Goal from './components/goal';
import Stats from './components/stats';
import Profile from './components/profile';
import MusicLesson from './components/musiclesson';
import PianoMan from './components/pianoman';
import TowerDefense from './components/towerdefense';

const BUTTON_SFX = require('../public/appsfx/mainsfx.mp3');

function App() {
  const [screen, setScreen] = useState('splash');
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  // Keep this player mounted at App level so screen changes don't destroy it.
  const buttonSoundPlayer = useAudioPlayer(BUTTON_SFX);

  const playButtonSound = useCallback(() => {
    try {
      buttonSoundPlayer.seekTo(0);
      buttonSoundPlayer.play();
    } catch (error) {
      console.warn('Button sound failed:', error);
    }
  }, [buttonSoundPlayer]);

  const navigate = useCallback((nextScreen) => {
    setScreen(nextScreen);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authenticatedUser) => {
      setUser(authenticatedUser);
      setScreen((currentScreen) => {
        if (authenticatedUser && currentScreen === 'splash') return 'mainmenu';
        return currentScreen;
      });
      if (authenticatedUser) {
        flushPendingGameResults().catch((error) => {
          console.error('Could not save pending game results.', error);
        });
      }
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080b25' }}>
        <ActivityIndicator color="#7de5ff" size="large" />
      </View>
    );
  }

  let currentScreen;
  switch (screen) {
    case 'login': currentScreen = <Login onNavigate={navigate} />; break;
    case 'signup': currentScreen = <Signup onNavigate={navigate} />; break;
    case 'mainmenu': currentScreen = <MainMenu onNavigate={navigate} playButtonSound={playButtonSound} isAuthenticated={Boolean(user)} />; break;
    case 'playmenu': currentScreen = <PlayMenu onNavigate={navigate} playButtonSound={playButtonSound} />; break;
    case 'settings': currentScreen = <Settings onNavigate={navigate} isAuthenticated={Boolean(user)} />; break;
    case 'minigame': currentScreen = <Minigame onNavigate={navigate} playButtonSound={playButtonSound} />; break;
    case 'goal': currentScreen = <Goal onNavigate={navigate} />; break;
    case 'stats': currentScreen = <Stats onNavigate={navigate} />; break;
    case 'profile': currentScreen = <Profile onNavigate={navigate} isAuthenticated={Boolean(user)} />; break;
    case 'musiclesson': currentScreen = <MusicLesson onNavigate={navigate} />; break;
    case 'pianoman': currentScreen = <PianoMan onNavigate={navigate} />; break;
    case 'towerdefense': currentScreen = <TowerDefense onNavigate={navigate} />; break;
    default: currentScreen = <SplashScreen onNavigate={navigate} playButtonSound={playButtonSound} />;
  }

  return <><StatusBar style="light" />{currentScreen}</>;
}

export default App;
