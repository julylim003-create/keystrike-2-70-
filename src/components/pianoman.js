import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { recordGameResult, recordGuestGameResult } from '../achievements';
import { auth } from '../firebase';
import AccountSavePrompt from './AccountSavePrompt';
import Keyboard from './Keyboard';
import { Page, styles } from './native';
import { useAudioPlayer } from 'expo-audio';

const SONGS = [
  {
    pic: require('../../public/coverpic/twinkle.png'),
    title: 'Twinkle Twinkle Little Star',
    bio: 'A classic nursery rhyme that has been sung for generations.',
    bpm: 100,
    notes: 'C C G G A A G:2 F F E E D D C:2 G G F F E E D:2 G G F F E E D:2 C C G G A A G:2 F F E E D D C:2',
  },
  {
    pic: require('../../public/coverpic/odetojoy.png'),
    title: 'Ode to Joy',
    bio: 'A famous piece by Ludwig van Beethoven.',
    bpm: 100,
    notes: 'E E F G G F E D C C D E E D D:2 E E F G G F E D C C D E D C C:2',
  },
  {
    pic: require('../../public/coverpic/marylamb.png'),
    title: 'Mary Had a Little Lamb',
    bio: 'A traditional folk song about a little lamb.',
    bpm: 100,
    notes: 'E D C D E E E:2 D D D:2 E G G:2 E D C D E E E E D D E D C:4',
  },
  {
    pic: require('../../public/coverpic/hotbuns.png'),
    title: 'Hot Cross Buns',
    bio: 'A traditional folk song.',
    bpm: 100,
    notes: 'E D C:2 E D C:2 C C C C D D D D E D C:2',
  },
  {
    pic: require('../../public/coverpic/frerejacques.png'),
    title: 'Frere Jacques',
    bio: 'A traditional French song.',
    bpm: 100,
    notes: 'C D E C C D E C E F G:2 E F G:2 G A G F E C G A G F E C C G C:2 C G C:2',
  },
];

const TEMPO = { easy: 0.8, normal: 1, hard: 1.2 };
const DIFFICULTIES = ['easy', 'normal', 'hard'];
const NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const TRAVEL_SECONDS = 3.7;
const NOTE_ANIMATION_SECONDS = 5;
const HIT_TOLERANCE = 0.38;
const LEAD_IN = 1;
const COUNTDOWN_START = 3;
const NOTE_STAFF = require('../../public/assets/pmannotes.png');
const PIANO_LOGO = require('../../public/assets/logo.png');
const PAUSE_ICON = require('../../public/assets/newsettings.png');
const BACK_ICON = require('../../public/assets/back.png');
const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);
const ButtonSoundContext = createContext(null);

// Navy palette (panels use #001248)
const NAVY = '#001248';
const NAVY_DEEP = '#000a30';
const NAVY_MID = '#0a2a7a';
const NAVY_RAISED = '#0b1f66';
const ACCENT = '#7fa8ff';
const ACCENT_SOFT = 'rgba(127,168,255,0.22)';
const ACCENT_LINE = 'rgba(127,168,255,0.55)';


function AnimatedPressable({ children, onPress, onPressIn, onPressOut, style, pressScale = 1.2, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const playButtonSound = useContext(ButtonSoundContext);

  const animateScale = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const resolvedStyle = typeof style === 'function' ? style({ pressed }) : style;
  const existingTransforms = resolvedStyle?.transform || [];

  return (
    <AnimatedPressableBase
      {...props}
      onPressIn={(event) => {
        setPressed(true);
        animateScale(pressScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        animateScale(1);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        playButtonSound?.();
        onPress?.(event);
      }}
      style={[resolvedStyle, { transform: [...existingTransforms, { scale }] }]}
    >
      {children}
    </AnimatedPressableBase>
  );
}


function buildMelody(song, difficulty) {
  const beat = 60 / (song.bpm * TEMPO[difficulty]);
  let time = 0;
  return song.notes.split(/\s+/).flatMap((token) => {
    const [note, length = '1'] = token.split(':');
    const duration = Number.parseFloat(length) * beat;
    const event = note === '-' ? [] : [{ note, delay: LEAD_IN + time, duration }];
    time += duration;
    return event;
  });
}

const DIFFICULTY_LABELS = { easy: 'Easy', normal: 'Medium', hard: 'Hard' };
const DIFFICULTY_COLORS = { easy: '#00c96b', normal: '#ffd83d', hard: '#ff3030' };
const DIFFICULTY_NOTES = {
  easy: 'Slower notes, more time to hit them',
  normal: 'The song at its original speed',
  hard: 'Faster notes, less time to react',
};
const DIFFICULTY_BARS = { easy: 1, normal: 2, hard: 3 };
const JUDGEMENTS = [
  { key: 'great', label: 'Great', color: '#00c96b' },
  { key: 'ok', label: 'OK', color: ACCENT },
  { key: 'meh', label: 'Meh', color: '#ffd83d' },
  { key: 'miss', label: 'Miss', color: '#ff3030' },
];

// Fades and slides its children in; used to stagger the rows and cards.
function Entrance({ delay = 0, children, style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function DifficultyBars({ count, color }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 24 }}>
      {[10, 17, 24].map((barHeight, i) => (
        <View
          key={barHeight}
          style={{
            width: 7,
            height: barHeight,
            marginRight: i < 2 ? 3 : 0,
            borderRadius: 3,
            backgroundColor: count > i ? color : 'rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </View>
  );
}

function PianoManSetup({ songs, difficulty, setDifficulty, selected, setSelected, onStart, onBack, width, height }) {
  const [tab, setTab] = useState('songs');
  const panelAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const advanceTimer = useRef(null);

  const selectedSong = songs.find((entry) => entry.title === selected) || null;

  useEffect(() => {
    const animation = Animated.spring(panelAnim, { toValue: 1, speed: 14, bounciness: 6, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [panelAnim]);

  useEffect(() => {
    contentAnim.setValue(0);
    const animation = Animated.timing(contentAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [tab, contentAnim]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const chooseSong = (title) => {
    setSelected(title);
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => setTab('difficulty'), 220);
  };

  const chooseDifficulty = (level) => {
    setDifficulty(level);
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => onStart(), 260);
  };

  const tabs = selectedSong
    ? [{ key: 'songs', label: 'Songs' }, { key: 'difficulty', label: 'Difficulty' }]
    : [{ key: 'songs', label: 'Songs' }];

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Back to main menu"
        pressScale={0.9}
        onPress={onBack}
        style={({ pressed }) => ({
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 30,
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: ACCENT_LINE,
          backgroundColor: pressed ? 'rgba(255,255,255,0.18)' : 'rgba(0,18,72,0.9)',
        })}
      >
        <Image source={BACK_ICON} resizeMode="contain" style={{ width: 24, height: 24 }} />
      </AnimatedPressable>

      <Animated.View style={{
        width: Math.min(330, width - 24),
        height: Math.min(540, height - 110),
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: NAVY,
        borderWidth: 1,
        borderColor: ACCENT_LINE,
        opacity: panelAnim,
        transform: [{ scale: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 18,
      }}>
        <View style={{ flexDirection: 'row', width: '100%' }}>
          {tabs.map(({ key, label }) => (
            <AnimatedPressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => setTab(key)}
              style={{
                flex: 1,
                minHeight: 55,
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomWidth: 3,
                borderBottomColor: tab === key ? ACCENT : 'transparent',
                backgroundColor: tab === key ? NAVY_MID : NAVY_DEEP,
              }}
            >
              <Text style={{ color: tab === key ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 17 }}>
                {label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        <Animated.View style={{
          flex: 1,
          opacity: contentAnim,
          transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        }}>
          {tab === 'songs' || !selectedSong ? (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 18 }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 14, marginLeft: 2 }}>
                Choose a song
              </Text>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {songs.map((entry, index) => {
                  const isSelected = selected === entry.title;
                  return (
                    <Entrance key={entry.title} delay={index * 60}>
                      <AnimatedPressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        pressScale={0.97}
                        onPress={() => chooseSong(entry.title)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          marginBottom: 10,
                          borderRadius: 14,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? ACCENT : 'rgba(255,255,255,0.14)',
                          backgroundColor: isSelected ? ACCENT_SOFT : 'rgba(255,255,255,0.05)',
                          opacity: pressed ? 0.9 : 1,
                        })}
                      >
                        <Image
                          source={entry.pic}
                          resizeMode="cover"
                          style={{ width: 54, height: 54, borderRadius: 10, marginRight: 12, backgroundColor: NAVY_RAISED }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                            {entry.title}
                          </Text>
                          <Text numberOfLines={2} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 3 }}>
                            {entry.bio}
                          </Text>
                        </View>
                      </AnimatedPressable>
                    </Entrance>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to songs"
                  pressScale={0.9}
                  onPress={() => setTab('songs')}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    marginRight: 8,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pressed ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)',
                  })}
                >
                  <Image source={BACK_ICON} resizeMode="contain" style={{ width: 24, height: 24 }} />
                </AnimatedPressable>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>Choose difficulty</Text>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              >
                <Entrance>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 10,
                    marginBottom: 16,
                    borderRadius: 14,
                    backgroundColor: NAVY_DEEP,
                    borderWidth: 1,
                    borderColor: ACCENT_SOFT,
                  }}>
                    <Image
                      source={selectedSong.pic}
                      resizeMode="cover"
                      style={{ width: 44, height: 44, borderRadius: 8, marginRight: 12, backgroundColor: NAVY_RAISED }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                        {selectedSong.title}
                      </Text>
                    </View>
                  </View>
                </Entrance>

                {DIFFICULTIES.map((level, index) => {
                  const isCurrent = difficulty === level;
                  const color = DIFFICULTY_COLORS[level];
                  return (
                    <Entrance key={level} delay={80 + index * 70}>
                      <AnimatedPressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isCurrent }}
                        pressScale={0.96}
                        onPress={() => chooseDifficulty(level)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          minHeight: 76,
                          marginBottom: 12,
                          paddingVertical: 12,
                          paddingRight: 14,
                          borderRadius: 14,
                          overflow: 'hidden',
                          borderWidth: isCurrent ? 2 : 1,
                          borderColor: isCurrent ? color : 'rgba(255,255,255,0.14)',
                          backgroundColor: isCurrent ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                          opacity: pressed ? 0.9 : 1,
                        })}
                      >
                        <View style={{ width: 6, alignSelf: 'stretch', marginRight: 14, marginVertical: -12, backgroundColor: color }} />
                        <View style={{ width: 40, alignItems: 'center', marginRight: 12 }}>
                          <DifficultyBars count={DIFFICULTY_BARS[level]} color={color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '700' }}>
                            {DIFFICULTY_LABELS[level]}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 3 }}>
                            {Math.round(selectedSong.bpm * TEMPO[level])} BPM · {DIFFICULTY_NOTES[level]}
                          </Text>
                        </View>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 26, marginLeft: 8 }}>›</Text>
                      </AnimatedPressable>
                    </Entrance>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Countdown({ value, title, label, color }) {
  // Play the countdown audio once when the countdown screen first appears.
  const countdownPlayer = useAudioPlayer(require('../../public/appsfx/countdown.mp3'));
  const scale = useRef(new Animated.Value(1.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    try {
      countdownPlayer.seekTo(0);
      countdownPlayer.play();
    } catch (soundError) {
      console.warn('Could not play countdown sound:', soundError);
    }
  }, [countdownPlayer]);

  useEffect(() => {
    const animation = Animated.timing(intro, { toValue: 1, duration: 300, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [intro]);

  useEffect(() => {
    scale.setValue(1.8);
    opacity.setValue(0);
    ring.setValue(0);

    const animation = Animated.parallel([
      Animated.spring(scale, { toValue: 1, speed: 14, bounciness: 8, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(560),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
      Animated.timing(ring, { toValue: 1, duration: 950, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [value, scale, opacity, ring]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgb(1,1,58)',
        opacity: intro,
      }}
    >
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 20, fontWeight: '600', marginBottom: 28 }}>
        Get ready
      </Text>
      <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            position: 'absolute',
            width: 170,
            height: 170,
            borderRadius: 85,
            borderWidth: 4,
            borderColor: color,
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.4] }) }],
          }}
        />
        <Animated.Text
          style={{
            color: '#fff',
            fontSize: 120,
            fontWeight: '800',
            opacity,
            transform: [{ scale }],
          }}
        >
          {value}
        </Animated.Text>
      </View>
      <Text numberOfLines={1} style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 28, paddingHorizontal: 24 }}>
        {title}
      </Text>
      <Text style={{ color, fontSize: 15, fontWeight: '700', marginTop: 6 }}>{label}</Text>
    </Animated.View>
  );
}

function ResultsOverlay({ results, accuracy, maxCombo, stats, width, onRetry, onMenu }) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(16)).current;
  const scoreScale = useRef(new Animated.Value(0.6)).current;

  // Card zoom & fade-in, then the score pops in.
  useEffect(() => {
    overlayOpacity.setValue(0);
    cardScale.setValue(0.94);
    cardOpacity.setValue(0);
    cardTranslateY.setValue(16);
    scoreScale.setValue(0.6);

    const animation = Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, speed: 18, bounciness: 4, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(220),
        Animated.spring(scoreScale, { toValue: 1, speed: 14, bounciness: 10, useNativeDriver: true }),
      ]),
    ]);

    animation.start();
    return () => animation.stop();
  }, [overlayOpacity, cardScale, cardOpacity, cardTranslateY, scoreScale]);

  const summary = [
    { label: 'Accuracy', value: `${accuracy}%`, color: '#fff' },
    { label: 'Max combo', value: `${maxCombo}`, color: '#fff' },
    { label: 'Difficulty', value: DIFFICULTY_LABELS[results.difficulty], color: DIFFICULTY_COLORS[results.difficulty] },
  ];

  return (
    <Animated.View style={{
      position: 'absolute',
      zIndex: 23,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: 'rgba(0,0,0,0.76)',
      opacity: overlayOpacity,
    }}>
      <Animated.View style={{
        width: Math.min(340, width - 48),
        padding: 22,
        borderWidth: 1,
        borderColor: ACCENT_LINE,
        borderRadius: 20,
        backgroundColor: NAVY,
        alignItems: 'stretch',
        shadowColor: '#3d6bff',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 18,
        elevation: 10,
        opacity: cardOpacity,
        transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
      }}>
        <Entrance delay={80}>
          <Text style={{ color: '#fff', fontFamily: 'Georgia', fontSize: 26, fontWeight: '700', textAlign: 'center' }}>
            Song Complete
          </Text>
          <Text numberOfLines={1} style={{ color: ACCENT, textAlign: 'center', marginTop: 6, fontSize: 14 }}>
            {results.title}
          </Text>
        </Entrance>

        <Entrance delay={160}>
          <View style={{ alignItems: 'center', marginTop: 14, marginBottom: 16 }}>
            <Animated.Text style={{ color: '#ffd35b', fontSize: 44, fontWeight: '800', transform: [{ scale: scoreScale }] }}>
              {results.score}
            </Animated.Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: -2 }}>points</Text>
          </View>
        </Entrance>

        <Entrance delay={240}>
          <View style={{ flexDirection: 'row', marginHorizontal: -4 }}>
            {summary.map(({ label, value, color }) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  marginHorizontal: 4,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Text style={{ color, fontSize: 17, fontWeight: '800' }}>{value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 }}>{label}</Text>
              </View>
            ))}
          </View>
        </Entrance>

        <Entrance delay={320}>
          <View style={{ flexDirection: 'row', marginHorizontal: -3, marginTop: 10 }}>
            {JUDGEMENTS.map(({ key, label, color }) => (
              <View
                key={key}
                style={{
                  flex: 1,
                  marginHorizontal: 3,
                  paddingVertical: 8,
                  alignItems: 'center',
                  borderRadius: 10,
                  borderTopWidth: 3,
                  borderTopColor: color,
                  backgroundColor: NAVY_DEEP,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{stats[key]}</Text>
                <Text style={{ color, fontSize: 11, marginTop: 1 }}>{label}</Text>
              </View>
            ))}
          </View>
        </Entrance>

        <Entrance delay={400}>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={onRetry}
            style={{ minHeight: 44, marginTop: 18, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: NAVY, fontWeight: '800' }}>Retry</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={onMenu}
            style={{ minHeight: 44, marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: ACCENT_LINE, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Return to menu</Text>
          </AnimatedPressable>
        </Entrance>
      </Animated.View>
    </Animated.View>
  );
}

function PianoMan({ onNavigate }) {
  const { width, height } = useWindowDimensions();
  // One shared player serves every UI button on this screen.
  const buttonSoundPlayer = useAudioPlayer(require('../../public/appsfx/mainsfx.mp3'));
  const playButtonSound = () => {
    try {
      buttonSoundPlayer.seekTo(0);
      buttonSoundPlayer.play();
    } catch (soundError) {
      console.warn('Could not play button sound:', soundError);
    }
  };
  const [selectedSong, setSelectedSong] = useState(null);
  const [difficulty, setDifficulty] = useState('normal');
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [song, setSong] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [notesPressed, setNotesPressed] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [results, setResults] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [highlightedNote, setHighlightedNote] = useState(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [judgementStats, setJudgementStats] = useState({ great: 0, ok: 0, meh: 0, miss: 0 });
  const [savePromptResult, setSavePromptResult] = useState(null);
  const [error, setError] = useState('');
  const processed = useRef(new Set());
  const startedAt = useRef(0);
  const pausedAt = useRef(0);
  const resultSaved = useRef(false);
  const statsRef = useRef({ great: 0, ok: 0, meh: 0, miss: 0 });
  const comboRef = useRef({ current: 0, max: 0 });
  const boardShake = useRef(new Animated.Value(0)).current;

  // Shakes the note board left and right when a note is missed.
  const shakeBoard = () => {
    boardShake.stopAnimation();
    boardShake.setValue(0);
    Animated.sequence([
      Animated.timing(boardShake, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(boardShake, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(boardShake, { toValue: -4, duration: 40, useNativeDriver: true }),
      Animated.timing(boardShake, { toValue: 4, duration: 40, useNativeDriver: true }),
      Animated.spring(boardShake, { toValue: 0, speed: 24, bounciness: 3, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (!playing || paused || !song.length) return undefined;
    const timer = setInterval(() => {
      const currentElapsed = (Date.now() - startedAt.current) / 1000;
      setElapsed(currentElapsed);
      let missed = false;
      song.forEach((entry, index) => {
        const hitAt = entry.delay + TRAVEL_SECONDS;
        if (!processed.current.has(index) && currentElapsed > hitAt + HIT_TOLERANCE) {
          processed.current.add(index);
          missed = true;
          statsRef.current.miss += 1;
          comboRef.current.current = 0;
        }
      });
      if (missed) {
        setJudgementStats({ ...statsRef.current });
        setCombo(0);
        setFeedback('MISS!');
        shakeBoard();
      }
      const songEnd = song[song.length - 1].delay + NOTE_ANIMATION_SECONDS;
      if (currentElapsed > songEnd) {
        setPlaying(false);
        setPaused(false);
        setFeedback('Song finished!');
        setResults({
          title: selectedSong?.title || 'Piano Man',
          difficulty,
          score,
          stats: { ...statsRef.current },
          totalNotes: song.length,
          maxCombo: comboRef.current.max,
          notesPressed,
        });
      }
    }, 50);
    return () => clearInterval(timer);
  }, [playing, paused, song, selectedSong, difficulty, score, notesPressed]);

  useEffect(() => {
    if (playing || !song.length || resultSaved.current || elapsed < song[song.length - 1].delay + NOTE_ANIMATION_SECONDS) return;
    resultSaved.current = true;
    const result = { score, notesPressed, songsCompleted: 1 };
    const saveResult = async () => {
      try {
        if (auth.currentUser) {
          await recordGameResult('pianoMan', result);
        } else {
          const guestResultId = await recordGuestGameResult('pianoMan', result);
          setSavePromptResult({ ...result, guestResultId });
        }
      } catch (saveError) {
        setError(saveError.message || 'Could not save this song result.');
      }
    };
    saveResult();
  }, [playing, song, elapsed, score, notesPressed]);

  const startSong = (entry = selectedSong, level = difficulty) => {
    if (!entry) {
      setFeedback('Choose a song first.');
      return;
    }
    const nextSong = buildMelody(entry, level);
    processed.current = new Set();
    resultSaved.current = false;
    setSelectedSong(entry);
    setDifficulty(level);
    setSong(nextSong);
    setElapsed(0);
    setScore(0);
    setNotesPressed(0);
    statsRef.current = { great: 0, ok: 0, meh: 0, miss: 0 };
    comboRef.current = { current: 0, max: 0 };
    setJudgementStats({ great: 0, ok: 0, meh: 0, miss: 0 });
    setCombo(0);
    setMaxCombo(0);
    setResults(null);
    setPaused(false);
    setError('');
    setFeedback(`Playing ${entry.title}`);
    startedAt.current = Date.now();
    setGameStarted(true);
    setPlaying(true);
  };

  // 3 → 2 → 1 → game starts
  useEffect(() => {
    if (countdown === null) return undefined;
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
      } else {
        setCountdown(null);
        startSong(selectedSong, difficulty);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const togglePause = () => {
    if (!playing && !paused) return;
    if (!paused) {
      pausedAt.current = Date.now();
      setPaused(true);
      return;
    }
    startedAt.current += Date.now() - pausedAt.current;
    setPaused(false);
  };

  const handleKeyPress = (note) => {
    if (!playing || paused) return;
    setHighlightedNote(note);
    setNotesPressed((count) => count + 1);
    let closest = { index: -1, difference: Infinity };
    song.forEach((entry, index) => {
      if (entry.note !== note || processed.current.has(index)) return;
      const difference = Math.abs(entry.delay + TRAVEL_SECONDS - elapsed);
      if (difference < closest.difference) closest = { index, difference };
    });
    if (closest.index >= 0 && closest.difference <= HIT_TOLERANCE) {
      processed.current.add(closest.index);
      const quality = closest.difference <= 0.12 ? 'great' : closest.difference <= 0.24 ? 'ok' : 'meh';
      const points = quality === 'great' ? 100 : quality === 'ok' ? 70 : 40;
      statsRef.current[quality] += 1;
      comboRef.current.current += 1;
      comboRef.current.max = Math.max(comboRef.current.max, comboRef.current.current);
      setJudgementStats({ ...statsRef.current });
      setCombo(comboRef.current.current);
      setMaxCombo(comboRef.current.max);
      setScore((current) => current + points);
      setFeedback(`${quality.toUpperCase()}! +${points} (${note})`);
    } else {
      setFeedback('NO NOTE');
    }
    setTimeout(() => setHighlightedNote(null), 160);
  };

  const restart = () => {
    if (selectedSong) startSong(selectedSong, difficulty);
  };

  const changeSelection = () => {
    setPlaying(false);
    setPaused(false);
    setGameStarted(false);
    setCountdown(null);
    setResults(null);
    setSong([]);
    setElapsed(0);
    setFeedback('');
    processed.current = new Set();
  };

  const hitLine = 80;
  const boardWidth = Math.min(360, width - 32);
  const logoWidth = Math.min(430, width);
  const keyboardHeight = Math.max(140, Math.min(220, height * 0.24));
  const accuracy = song.length
    ? Math.round(((judgementStats.great + judgementStats.ok + judgementStats.meh) / song.length) * 100)
    : 0;

  return (
    <ButtonSoundContext.Provider value={playButtonSound}>
    <Page
      scroll={false}
      style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, justifyContent: 'flex-start' }}
      contentStyle={{ maxWidth: '100%', flex: 1, alignItems: 'stretch' }}
    >
      <View style={{ flex: 1, width: '100%', overflow: 'hidden', backgroundColor: 'rgb(1,1,58)' }}>
        {!gameStarted ? (
          countdown !== null ? (
            <Countdown
              value={countdown}
              title={selectedSong?.title || ''}
              label={DIFFICULTY_LABELS[difficulty]}
              color={DIFFICULTY_COLORS[difficulty]}
            />
          ) : (
            <PianoManSetup
              songs={SONGS}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              selected={selectedSong?.title || ''}
              setSelected={(title) => setSelectedSong(SONGS.find((entry) => entry.title === title) || null)}
              onStart={() => {
                if (selectedSong) setCountdown(COUNTDOWN_START);
              }}
              onBack={() => onNavigate('minigame')}
              width={width}
              height={height}
            />
          )
        ) : (
          <>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Resume game' : 'Pause game'}
              disabled={!selectedSong}
              onPress={togglePause}
              style={({ pressed }) => ({
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 25,
                width: 52,
                height: 52,
                opacity: !selectedSong ? 0.55 : pressed ? 0.8 : 1,
              })}
            >
              <Image source={PAUSE_ICON} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
            </AnimatedPressable>

            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                paddingTop: 12,
                paddingHorizontal: 12,
              }}
            >
              <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Change song or difficulty"
                  pressScale={0.95}
                  onPress={changeSelection}
                  style={({ pressed }) => ({
                    width: 96,
                    minHeight: 44,
                    paddingVertical: 6,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: ACCENT_LINE,
                    borderRadius: 14,
                    backgroundColor: pressed ? 'rgba(127,168,255,0.2)' : 'rgba(0,18,72,0.9)',
                  })}
                >
                  <Text style={{ color: '#fff', fontSize: 11, textAlign: 'center' }}>Change Song / Difficulty</Text>
                </AnimatedPressable>

                <View style={{
                  flex: 1,
                  marginHorizontal: 8,
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                  alignItems: 'center',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.18)',
                  backgroundColor: 'rgba(0,18,72,0.85)',
                }}>
                  <Text style={{ color: '#ffd35b', fontSize: 20, fontWeight: '800', lineHeight: 24 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600' }}>Score </Text>
                    {score}
                  </Text>
                  <Text numberOfLines={1} style={{ color: '#fff', fontSize: 12, fontWeight: '600', lineHeight: 16 }}>
                    {feedback || ' '}
                  </Text>
                </View>

                <View style={{ width: 52 }} />
              </View>

              <Text numberOfLines={1} style={{
                textAlign: 'center',
                marginTop: 8,
                color: 'rgba(255,255,255,0.8)',
                fontSize: 12,
              }}>
                {selectedSong?.title} · {DIFFICULTY_LABELS[difficulty]}{combo > 1 ? ` · ${combo} combo` : ''}
              </Text>
            </View>

            <Animated.View style={{
              position: 'absolute',
              zIndex: 2,
              top: '50%',
              alignSelf: 'center',
              width: boardWidth,
              height: 190,
              overflow: 'hidden',
              borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.2)',
              paddingHorizontal: 30,
              paddingVertical: 20,
              marginBottom: -20,
              shadowColor: '#fff',
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 5,
              transform: [{ translateY: -240 }, { translateX: boardShake }],
            }}>
              <Image
                source={NOTE_STAFF}
                resizeMode="stretch"
                style={{ position: 'absolute', left: 30, top: 20, width: boardWidth - 60, height: 150 }}
              />
              <View style={{
                position: 'absolute',
                zIndex: 4,
                left: hitLine,
                top: 0,
                height: 200,
                width: 3,
                backgroundColor: '#fff',
              }} />
              {song.map((entry, index) => {
                if (processed.current.has(index)) return null;
                const progress = (elapsed - entry.delay) / NOTE_ANIMATION_SECONDS;
                if (progress < 0 || progress > 1) return null;
                const left = progress < 0.1
                  ? 500 - (progress / 0.1) * 180
                  : 320 - ((progress - 0.1) / 0.9) * 360;
                return (
                  <View key={`${entry.note}-${index}`} style={{
                    position: 'absolute',
                    zIndex: 5,
                    left,
                    top: { C: 74, D: 142, E: 131, F: 119, G: 108, A: 96, B: 84 }[entry.note],
                    width: 35,
                    height: 20,
                    borderRadius: 12,
                    backgroundColor: 'rgb(251,234,0)',
                    opacity: Math.max(0, Math.min((progress - 0.1) / 0.7, 1)),
                  }} />
                );
              })}
            </Animated.View>

            <Image
              source={PIANO_LOGO}
              resizeMode="contain"
              style={{
                position: 'absolute',
                zIndex: 1,
                alignSelf: 'center',
                bottom: -55,
                width: logoWidth,
                height: logoWidth * (3496 / 1608),
                marginTop: -20,
              }}
            />
            <View style={{
              position: 'absolute',
              zIndex: 3,
              bottom: 55,
              alignSelf: 'center',
              width: Math.min(430, width - 32),
              height: keyboardHeight,
              borderWidth: 1,
              borderColor: '#fff',
              borderRadius: 30,
              overflow: 'hidden',
            }}>
              <Keyboard
                highlightedNote={highlightedNote}
                onPress={handleKeyPress}
                disabled={paused || !playing}
                height={keyboardHeight}
                gameLayout
              />
            </View>
          </>
        )}

        {error ? (
          <Text accessibilityRole="alert" style={[styles.error, { position: 'absolute', top: '22%', alignSelf: 'center', zIndex: 15 }]}>
            {error}
          </Text>
        ) : null}

        {paused && gameStarted && (
          <View style={{
            position: 'absolute',
            zIndex: 24,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backgroundColor: 'rgba(0,0,0,0.72)',
          }}>
            <View style={{
              width: Math.min(300, width - 48),
              padding: 24,
              borderWidth: 1,
              borderColor: ACCENT_LINE,
              borderRadius: 18,
              backgroundColor: NAVY,
              alignItems: 'stretch',
              shadowColor: '#000',
              shadowOpacity: 0.5,
              shadowRadius: 18,
              elevation: 12,
            }}>
              <Text style={{ color: '#fff', textAlign: 'center', fontFamily: 'Georgia', fontSize: 28, fontWeight: '700', marginBottom: 8 }}>
                Paused
              </Text>
              {[
                { label: 'Resume', action: togglePause, highlighted: true },
                { label: 'Retry', action: restart },
                { label: 'Return to menu', action: () => onNavigate('minigame') },
              ].map(({ label, action, highlighted }) => (
                <AnimatedPressable
                  key={label}
                  accessibilityRole="button"
                  onPress={action}
                  style={({ pressed }) => ({
                    minHeight: 42,
                    marginTop: 10,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: highlighted ? '#c9dbff' : ACCENT_LINE,
                    borderRadius: 10,
                    backgroundColor: highlighted ? ACCENT : NAVY_RAISED,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{
                    color: highlighted ? NAVY : '#fff',
                    fontFamily: 'Georgia',
                    fontSize: 14,
                    fontWeight: '700',
                  }}>
                    {label}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        )}

        {results && (
          <ResultsOverlay
            results={results}
            accuracy={accuracy}
            maxCombo={maxCombo}
            stats={judgementStats}
            width={width}
            onRetry={restart}
            onMenu={() => onNavigate('minigame')}
          />
        )}

      {savePromptResult && (
        <AccountSavePrompt
          mode="pianoMan"
          result={savePromptResult}
          onNavigate={onNavigate}
          onDismiss={() => setSavePromptResult(null)}
        />
      )}
      </View>
    </Page>
    </ButtonSoundContext.Provider>
  );
}

export default PianoMan;
