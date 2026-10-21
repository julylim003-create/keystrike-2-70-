import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Image, ImageBackground, Pressable, SafeAreaView, Text, useWindowDimensions, View } from 'react-native';
import { recordGameResult, recordGuestGameResult } from '../achievements';
import { auth } from '../firebase';
import AccountSavePrompt from './AccountSavePrompt';
import Keyboard from './Keyboard';
import { AppButton, BackButton, COLORS, styles } from './native';

const NOTES = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'E#', 'Fb', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'B#', 'Cb'];
const NOTE_PITCH = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, 'E#': 5, Fb: 4,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10,
  B: 11, 'B#': 0, Cb: 11,
};
const KEYBOARD_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MONSTERS = [
  require('../../public/monsters/m1.png'),
  require('../../public/monsters/m2.png'),
  require('../../public/monsters/m3.png'),
  require('../../public/monsters/m4.png'),
  require('../../public/monsters/m5.png'),
];
const POOFS = [
  require('../../public/assets/poof1.gif'),
  require('../../public/assets/poof2.gif'),
  require('../../public/assets/poof3.gif'),
];
const BACKGROUND = require('../../public/bg.jpg');
const NOTE_IMAGES = {
  A: require('../../public/note/A1.png'),
  B: require('../../public/note/B.png'),
  C: require('../../public/note/C4.png'),
  D: require('../../public/note/D4.png'),
  E: require('../../public/note/E4.png'),
  F: require('../../public/note/F4.png'),
  G: require('../../public/note/G4.png'),
};
const MAX_HP = 100;
const SPAWN_DELAY = 1500;
const TRAVEL_DURATION = 6500;
const POOF_DURATION = 900;

function makeWave(tier) {
  return Array.from({ length: 4 + tier }, (_, index) => ({
    id: `${tier}-${index}-${Date.now()}`,
    note: NOTES[Math.floor(Math.random() * NOTES.length)],
    monster: ((index + tier - 1) % MONSTERS.length),
  }));
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'spawn':
      if (!state.queue.length || state.hp <= 0 || state.paused) return state;
      return {
        ...state,
        queue: state.queue.slice(1),
        mobs: [...state.mobs, { ...state.queue[0], bornAt: action.clock }],
      };
    case 'hit':
      if (state.paused || !state.mobs.some((mob) => mob.id === action.id && !mob.defeated)) return state;
      return {
        ...state,
        mobs: state.mobs.map((mob) => mob.id === action.id
          ? { ...mob, defeated: true, poof: action.poof }
          : mob),
        score: state.score + 100,
        combo: state.combo + 1,
      };
    case 'clear-hit':
      return { ...state, mobs: state.mobs.filter((mob) => mob.id !== action.id) };
    case 'press':
      if (state.paused || state.hp <= 0) return state;
      return { ...state, notesPressed: state.notesPressed + 1 };
    case 'miss':
      if (state.paused || state.hp <= 0) return state;
      return { ...state, combo: 0 };
    case 'leak':
      if (state.paused || !state.mobs.some((mob) => mob.id === action.id && !mob.defeated)) return state;
      return {
        ...state,
        hp: Math.max(0, state.hp - 10),
        combo: 0,
        mobs: state.mobs.filter((mob) => mob.id !== action.id),
      };
    case 'next-wave':
      if (state.paused || state.hp <= 0 || state.queue.length || state.mobs.length) return state;
      return { ...state, tier: state.tier + 1, queue: makeWave(state.tier + 1) };
    case 'toggle-pause':
      if (state.hp <= 0) return state;
      return { ...state, paused: !state.paused };
    case 'restart':
      return {
        tier: 1,
        hp: MAX_HP,
        queue: makeWave(1),
        mobs: [],
        paused: false,
        score: 0,
        combo: 0,
        notesPressed: 0,
      };
    default:
      return state;
  }
}

const initialGame = {
  tier: 1,
  hp: MAX_HP,
  queue: makeWave(1),
  mobs: [],
  paused: false,
  score: 0,
  combo: 0,
  notesPressed: 0,
};

function TowerDefense({ onNavigate }) {
  const { width, height } = useWindowDimensions();
  const [game, dispatch] = useReducer(gameReducer, initialGame);
  const [clock, setClock] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  const [savePromptResult, setSavePromptResult] = useState(null);
  const [highlightedNote, setHighlightedNote] = useState(null);
  const scoreSaveStarted = useRef(false);
  const clockRef = useRef(0);
  clockRef.current = clock;
  const gameRef = useRef(game);
  gameRef.current = game;
  const defeated = game.hp <= 0;
  const keyboardHeight = Math.max(100, Math.min(160, height * 0.18));
  const sharpHeight = keyboardHeight * 0.62;
  const monsterSize = Math.min(84, Math.max(72, width * 0.2));
  const noteSize = Math.min(64, Math.max(52, width * 3.15));
  const currentTarget = game.mobs.find((mob) => !mob.defeated);
  const keyboardTarget = currentTarget
    ? KEYBOARD_NOTES[NOTE_PITCH[currentTarget.note]]
    : undefined;

  useEffect(() => {
    if (game.paused || defeated) return undefined;
    const timer = setInterval(() => setClock((current) => current + 50), 50);
    return () => clearInterval(timer);
  }, [game.paused, defeated]);

  useEffect(() => {
    if (!game.queue.length || defeated || game.paused) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'spawn', clock: clockRef.current }), SPAWN_DELAY);
    return () => clearTimeout(timer);
  }, [game.queue.length, defeated, game.paused]);

  useEffect(() => {
    if (game.queue.length || game.mobs.length || defeated || game.paused) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'next-wave' }), 1800);
    return () => clearTimeout(timer);
  }, [game.queue.length, game.mobs.length, defeated, game.paused]);

  useEffect(() => {
    game.mobs.forEach((mob) => {
      if (!mob.defeated && clock - mob.bornAt >= TRAVEL_DURATION) {
        dispatch({ type: 'leak', id: mob.id });
      }
    });
  }, [clock, game.mobs]);

  useEffect(() => {
    if (!defeated) {
      scoreSaveStarted.current = false;
      setSaveStatus('');
      return;
    }
    if (scoreSaveStarted.current) return;
    scoreSaveStarted.current = true;
    const result = { score: game.score, notesPressed: game.notesPressed, highestTier: game.tier };
    const saveResult = async () => {
      if (!auth.currentUser) {
        try {
          const guestResultId = await recordGuestGameResult('towerDefense', result);
          setSavePromptResult({ ...result, guestResultId });
        } catch (saveError) {
          setSaveStatus(saveError.message || 'Score could not be saved locally.');
        }
        return;
      }
      setSaveStatus('Saving score...');
      try {
        await recordGameResult('towerDefense', result);
        setSaveStatus('Score saved to your account.');
      } catch (saveError) {
        setSaveStatus(saveError.message || 'Score could not be saved.');
      }
    };
    saveResult();
  }, [defeated, game.notesPressed, game.score, game.tier]);

  // Stable callback (reads latest state via ref) so memoized piano keys don't re-render every 50ms tick.
  const playNote = useCallback((note) => {
    const g = gameRef.current;
    if (g.paused || g.hp <= 0) return;
    setHighlightedNote(note);
    dispatch({ type: 'press' });
    const target = g.mobs.find((mob) => !mob.defeated);
    if (target && NOTE_PITCH[target.note] === NOTE_PITCH[note]) {
      dispatch({ type: 'hit', id: target.id, poof: Math.floor(Math.random() * POOFS.length) });
      setTimeout(() => dispatch({ type: 'clear-hit', id: target.id }), POOF_DURATION);
    } else if (target) {
      dispatch({ type: 'miss' });
    }
    setTimeout(() => setHighlightedNote(null), 150);
  }, []);

  const restart = () => {
    scoreSaveStarted.current = false;
    setSavePromptResult(null);
    setClock(0);
    dispatch({ type: 'restart' });
  };

  return (
    <ImageBackground source={BACKGROUND} resizeMode="stretch" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12, alignItems: 'center' }}>
          <View style={{ width: '100%', height: 42, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton
              label="‹  Minigames"
              onPress={() => onNavigate('minigame')}
              style={{ position: 'relative', top: 0, left: 0, width: 42, height: 42 }}
            />
            <View style={{ flex: 1, height: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#10121d', borderRadius: 6, backgroundColor: '#1b1714' }}>
              <View style={{ width: `${game.hp}%`, height: '100%', backgroundColor: '#6be19b' }} />
              <Text style={{ position: 'absolute', top: 0, left: 0, right: 0, color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 3 }}>
                {game.hp}/100
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={game.paused ? 'Resume game' : 'Pause game'}
              onPress={() => dispatch({ type: 'toggle-pause' })}
              disabled={defeated}
              style={({ pressed }) => ({
                minWidth: 58,
                height: 34,
                paddingHorizontal: 10,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.8)',
                borderRadius: 5,
                backgroundColor: '#102765',
                opacity: defeated ? 0.5 : pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: '#fff', fontFamily: 'Georgia', fontSize: 13, fontWeight: '700' }}>
                {game.paused ? 'Resume' : 'Pause'}
              </Text>
            </Pressable>
          </View>
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3, paddingHorizontal: 2 }}>
            <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '800', textShadowColor: '#071136', textShadowRadius: 3 }}>TIER {game.tier}</Text>
            <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '700', textShadowColor: '#071136', textShadowRadius: 3 }}>
              {game.mobs.length} on field · {game.queue.length} incoming
            </Text>
            <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '800', textShadowColor: '#071136', textShadowRadius: 3 }}>
              Score {game.score}
            </Text>
          </View>

          <View style={{
            flex: 1,
            width: '100%',
            minHeight: 180,
            overflow: 'hidden',
            marginTop: 4,
            marginBottom: 8,
          }}>
            {game.mobs.map((mob) => {
              const progress = Math.min(1, Math.max(0, (clock - mob.bornAt) / TRAVEL_DURATION));
              const maxLeft = 100 - (monsterSize / width) * 100 - 1;
              const left = `${Math.max(1, Math.min(maxLeft, 3 + progress * (maxLeft - 3)))}%`;
              return (
                <View key={mob.id} style={{ position: 'absolute', left, top: '53%', alignItems: 'center' }}>
                  {mob.defeated ? (
                    <Image source={POOFS[mob.poof]} resizeMode="contain" style={{ width: monsterSize, height: monsterSize }} />
                  ) : (
                    <>
                      <Image
                        source={NOTE_IMAGES[mob.note[0]]}
                        resizeMode="contain"
                        style={{ width: noteSize, height: noteSize * 0.72, marginBottom: 4 }}
                        accessibilityLabel={`${mob.note} note`}
                      />
                      <Image source={MONSTERS[mob.monster]} resizeMode="contain" style={{ width: monsterSize, height: monsterSize }} />
                    </>
                  )}
                </View>
              );
            })}
            {game.queue.length > 0 && (
              <Text style={{ position: 'absolute', right: 6, top: 6, color: COLORS.text, fontSize: 11, fontWeight: '700', textShadowColor: '#071136', textShadowRadius: 3 }}>
                Next: {game.queue[0].note}
              </Text>
            )}
          </View>

          <Text accessibilityLiveRegion="polite" style={{ color: COLORS.primary, fontWeight: '800', marginBottom: 6, textShadowColor: '#071136', textShadowRadius: 3 }}>
            {currentTarget ? `Play ${keyboardTarget} to defend the castle` : 'Get ready for the next monster'}
          </Text>
          <View style={{ width: '100%', height: keyboardHeight, borderWidth: 1, borderColor: '#fff', borderRadius: 10, overflow: 'hidden' }}>
            <Keyboard
              includeSharps
              height={keyboardHeight}
              sharpHeight={sharpHeight}
              highlightedNote={highlightedNote}
              onPress={playNote}
              disabled={game.paused || defeated}
            />
          </View>
          {defeated && (
            <View style={[styles.card, { width: '100%', alignItems: 'center', marginTop: 12, padding: 12 }]}>
              <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800' }}>The castle has fallen</Text>
              <Text style={{ color: COLORS.muted, marginVertical: 7 }}>{saveStatus}</Text>
              <AppButton title="Play again" onPress={restart} />
            </View>
          )}
          {game.paused && !defeated && (
            <View style={{
              position: 'absolute',
              zIndex: 8,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              backgroundColor: 'rgba(7,23,68,0.68)',
            }}>
              <View style={{ width: '100%', maxWidth: 280, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 8, backgroundColor: '#091849', alignItems: 'stretch' }}>
                <Text style={{ color: COLORS.text, fontFamily: 'Georgia', fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>Paused</Text>
                <AppButton title="Resume" onPress={() => dispatch({ type: 'toggle-pause' })} style={{ minHeight: 42 }} />
                <AppButton title="Retry" onPress={restart} secondary style={{ minHeight: 42 }} />
                <Pressable onPress={() => onNavigate('minigame')} style={{ padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.primary }}>Return to menu</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
      {savePromptResult && (
        <AccountSavePrompt
          mode="towerDefense"
          result={savePromptResult}
          onNavigate={onNavigate}
          onDismiss={() => setSavePromptResult(null)}
        />
      )}
    </ImageBackground>
  );
}

export default TowerDefense;