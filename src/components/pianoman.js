import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { recordGameResult, recordGuestGameResult } from '../achievements';
import { auth } from '../firebase';
import AccountSavePrompt from './AccountSavePrompt';
import Keyboard from './Keyboard';
import { Page, styles } from './native';

const SONGS = [
  {
    title: 'Twinkle Twinkle Little Star',
    bpm: 100,
    notes: 'C C G G A A G:2 F F E E D D C:2 G G F F E E D:2 G G F F E E D:2 C C G G A A G:2 F F E E D D C:2',
  },
  {
    title: 'Ode to Joy',
    bpm: 100,
    notes: 'E E F G G F E D C C D E E D D:2 E E F G G F E D C C D E D C C:2',
  },
  {
    title: 'Mary Had a Little Lamb',
    bpm: 100,
    notes: 'E D C D E E E:2 D D D:2 E G G:2 E D C D E E E E D D E D C:4',
  },
  {
    title: 'Hot Cross Buns',
    bpm: 100,
    notes: 'E D C:2 E D C:2 C C C C D D D D E D C:2',
  },
  {
    title: 'Frere Jacques',
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
const NOTE_STAFF = require('../../public/assets/pmannotes.png');
const PIANO_LOGO = require('../../public/assets/logo.png');
const PAUSE_ICON = require('../../public/assets/settings.png');
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

function PianoManSetup({ songs, difficulty, setDifficulty, selected, setSelected, onStart, width }) {
  const [tab, setTab] = useState('difficulty');

  return (
    <View style={{
      position: 'absolute',
      zIndex: 20,
      alignSelf: 'center',
      top: '50%',
      width: Math.min(330, width - 24),
      minHeight: 480,
      maxHeight: '94%',
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: 'rgb(15, 5, 95)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      transform: [{ translateY: -240 }],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 15 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 18,
    }}>
      <View style={{ flexDirection: 'row', width: '100%' }}>
        {[
          { key: 'difficulty', label: 'Difficulty' },
          { key: 'songs', label: 'Songs' },
        ].map(({ key, label }) => (
          <Pressable
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
              borderBottomColor: tab === key ? '#fff' : 'transparent',
              backgroundColor: tab === key ? 'rgb(28, 12, 115)' : 'rgb(9, 3, 62)',
            }}
          >
            <Text style={{ color: tab === key ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 17 }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'difficulty' ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 10, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '400', marginBottom: 28 }}>
            Difficulty
          </Text>
          {DIFFICULTIES.map((level) => (
            <Pressable
              key={level}
              accessibilityRole="button"
              accessibilityState={{ selected: difficulty === level }}
              onPress={() => setDifficulty(level)}
              style={({ pressed }) => ({
                width: 145,
                height: 62,
                marginBottom: 28,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                backgroundColor: DIFFICULTY_COLORS[level],
                borderWidth: difficulty === level ? 4 : 0,
                borderColor: '#fff',
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 1.03 : 1 }],
              })}
            >
              <Text style={{ color: '#fff', fontSize: 32 }}>{DIFFICULTY_LABELS[level]}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 4, flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '400', textAlign: 'center', marginBottom: 28 }}>
            Songs
          </Text>
          <ScrollView style={{ maxHeight: 275 }} contentContainerStyle={{ paddingRight: 3 }}>
            {songs.map((entry) => (
              <Pressable
                key={entry.title}
                accessibilityRole="button"
                accessibilityState={{ selected: selected === entry.title }}
                onPress={() => setSelected(entry.title)}
                style={({ pressed }) => ({
                  width: '100%',
                  minHeight: 48,
                  paddingVertical: 10,
                  paddingHorizontal: 13,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 8,
                  backgroundColor: selected === entry.title ? '#fff' : 'rgba(255,255,255,0.08)',
                  justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{
                  color: selected === entry.title ? 'rgb(15,5,95)' : '#fff',
                  fontSize: 15,
                  fontWeight: selected === entry.title ? '700' : '400',
                }}>
                  {entry.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{
        marginHorizontal: 20,
        marginTop: 5,
        marginBottom: 14,
        padding: 10,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.25)',
      }}>
        <Text style={{ color: '#fff', fontSize: 13, lineHeight: 21 }}>
          Song: <Text style={{ fontWeight: '700' }}>{selected || 'None selected'}</Text>
        </Text>
        <Text style={{ color: '#fff', fontSize: 13, lineHeight: 21 }}>
          Difficulty: <Text style={{ fontWeight: '700' }}>{DIFFICULTY_LABELS[difficulty]}</Text>
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !selected }}
        disabled={!selected}
        onPress={onStart}
        style={({ pressed }) => ({
          height: 50,
          marginHorizontal: 20,
          marginBottom: 20,
          borderRadius: 10,
          backgroundColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: !selected ? 0.4 : pressed ? 0.86 : 1,
        })}
      >
        <Text style={{ color: 'rgb(15,5,95)', fontSize: 18, fontWeight: '700' }}>Start Game</Text>
      </Pressable>
    </View>
  );
}

function PianoMan({ onNavigate }) {
  const { width, height } = useWindowDimensions();
  const [selectedSong, setSelectedSong] = useState(null);
  const [difficulty, setDifficulty] = useState('normal');
  const [gameStarted, setGameStarted] = useState(false);
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
    <Page
      scroll={false}
      style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, justifyContent: 'flex-start' }}
      contentStyle={{ maxWidth: '100%', flex: 1, alignItems: 'stretch' }}
    >
      <View style={{ flex: 1, width: '100%', overflow: 'hidden', backgroundColor: 'rgb(1,1,58)' }}>
        {!gameStarted ? (
          <PianoManSetup
            songs={SONGS}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            selected={selectedSong?.title || ''}
            setSelected={(title) => setSelectedSong(SONGS.find((entry) => entry.title === title) || null)}
            onStart={() => {
              if (selectedSong) startSong(selectedSong, difficulty);
            }}
            width={width}
          />
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Resume game' : 'Pause game'}
              disabled={!selectedSong}
              onPress={togglePause}
              style={({ pressed }) => ({
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 25,
                width: 80,
                height: 80,
                opacity: !selectedSong ? 0.55 : pressed ? 0.8 : 1,
              })}
            >
              <Image source={PAUSE_ICON} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
            </Pressable>

            <View style={{
              position: 'absolute',
              top: 30,
              alignSelf: 'center',
              width: 300,
              borderBottomWidth: 3,
              borderBottomColor: 'yellow',
            }} />
            <Text style={{
              position: 'absolute',
              top: 50,
              alignSelf: 'center',
              zIndex: 10,
              color: '#fff',
              fontSize: 19,
              fontWeight: '700',
            }}>
              Score: {score} | {feedback}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={changeSelection}
              style={({ pressed }) => ({
                position: 'absolute',
                zIndex: 12,
                top: 90,
                alignSelf: 'center',
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.7)',
                borderRadius: 16,
                backgroundColor: pressed ? 'rgba(255,255,255,0.14)' : 'rgba(1,1,58,0.9)',
              })}
            >
              <Text style={{ color: '#fff', fontSize: 12 }}>Change Song / Difficulty</Text>
            </Pressable>
            <Text style={{
              position: 'absolute',
              top: 130,
              zIndex: 10,
              alignSelf: 'center',
              color: 'rgba(255,255,255,0.8)',
              fontSize: 13,
            }}>
              {selectedSong?.title} · {DIFFICULTY_LABELS[difficulty]}{combo > 1 ? ` · ${combo} combo` : ''}
            </Text>

            <View style={{
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
              transform: [{ translateY: -240 }],
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
            </View>

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
              borderColor: 'rgba(255,255,255,0.4)',
              borderRadius: 8,
              backgroundColor: '#091849',
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
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  onPress={action}
                  style={({ pressed }) => ({
                    minHeight: 42,
                    marginTop: 10,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: highlighted ? '#ffd35b' : 'rgba(255,255,255,0.65)',
                    borderRadius: 5,
                    backgroundColor: highlighted ? '#ffd35b' : '#102765',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{
                    color: highlighted ? '#171717' : '#fff',
                    fontFamily: 'Georgia',
                    fontSize: 14,
                    fontWeight: '700',
                  }}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {results && (
          <View style={{
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
          }}>
            <View style={{
              width: Math.min(340, width - 48),
              padding: 24,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.4)',
              borderRadius: 10,
              backgroundColor: '#091849',
              alignItems: 'stretch',
            }}>
              <Text style={{ color: '#fff', fontFamily: 'Georgia', fontSize: 26, fontWeight: '700', textAlign: 'center' }}>
                Song Complete
              </Text>
              <Text style={{ color: '#fff', textAlign: 'center', marginTop: 6 }}>{results.title}</Text>
              <Text style={{ color: '#ffd35b', textAlign: 'center', fontSize: 30, fontWeight: '700', marginVertical: 12 }}>
                {results.score} points
              </Text>
              <Text style={{ color: '#fff', lineHeight: 23 }}>Difficulty: {DIFFICULTY_LABELS[results.difficulty]}</Text>
              <Text style={{ color: '#fff', lineHeight: 23 }}>Accuracy: {accuracy}%</Text>
              <Text style={{ color: '#fff', lineHeight: 23 }}>Max combo: {maxCombo}</Text>
              <Text style={{ color: '#fff', lineHeight: 23 }}>
                Great {judgementStats.great} · OK {judgementStats.ok} · Meh {judgementStats.meh} · Miss {judgementStats.miss}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={restart}
                style={{ minHeight: 44, marginTop: 16, borderRadius: 6, backgroundColor: '#ffd35b', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#171717', fontWeight: '700' }}>Retry</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => onNavigate('minigame')}
                style={{ minHeight: 44, marginTop: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Return to menu</Text>
              </Pressable>
            </View>
          </View>
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
  );
}

export default PianoMan;
