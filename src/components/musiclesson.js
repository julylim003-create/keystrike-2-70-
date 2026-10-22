import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, Text, View } from 'react-native';
import { recordGameResult, recordGuestGameResult } from '../achievements';
import { auth } from '../firebase';
import AccountSavePrompt from './AccountSavePrompt';
import { AppButton, BackButton, COLORS, Page, styles } from './native';
import PianoLessonMenu from './PianoLessonMenu';

const TREBLE_QUESTIONS = [
  { note: 'B4', answer: 'B', options: ['C', 'D', 'B'] },
  { note: 'C4', answer: 'C', options: ['C', 'E', 'G'] },
  { note: 'D4', answer: 'D', options: ['D', 'F', 'A'] },
  { note: 'E4', answer: 'E', options: ['C', 'E', 'B'] },
  { note: 'F4', answer: 'F', options: ['F', 'G', 'D'] },
  { note: 'G4', answer: 'G', options: ['E', 'G', 'A'] },
  { note: 'A4', answer: 'A', options: ['F', 'A', 'C'] },
  { note: 'B4', answer: 'B', options: ['B', 'D', 'G'] },
  { note: 'C5', answer: 'C', options: ['A', 'C', 'E'] },
  { note: 'D5', answer: 'D', options: ['B', 'D', 'F'] },
];

const BASS_QUESTIONS = [
  { note: 'E', answer: 'E', options: ['E', 'G', 'A'] },
  { note: 'F', answer: 'F', options: ['C', 'F', 'A'] },
  { note: 'G', answer: 'G', options: ['G', 'A', 'C'] },
  { note: 'A', answer: 'A', options: ['D', 'A', 'F'] },
  { note: 'B', answer: 'B', options: ['D', 'B', 'F'] },
  { note: 'C', answer: 'C', options: ['C', 'E', 'G'] },
  { note: 'D', answer: 'D', options: ['C', 'D', 'E'] },
  { note: 'E2', answer: 'E', options: ['E', 'G', 'A'] },
  { note: 'F2', answer: 'F', options: ['C', 'F', 'A'] },
  { note: 'G2', answer: 'G', options: ['G', 'A', 'C'] },
  { note: 'A2', answer: 'A', options: ['D', 'A', 'F'] },
];

const CHORD_QUESTIONS = [
  { note: 'C Major', answer: 'C', options: ['C', 'G', 'A'] },
  { note: 'G Major', answer: 'G', options: ['D', 'G', 'F'] },
  { note: 'A Minor', answer: 'A', options: ['A', 'C', 'E'] },
];

const shuffleQuestions = (questions) => {
  const shuffled = [...questions];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

const NOTE_IMAGES = {
  C4: require('../../public/note/C4.png'),
  D4: require('../../public/note/D4.png'),
  E4: require('../../public/note/E4.png'),
  F4: require('../../public/note/F4.png'),
  G4: require('../../public/note/G4.png'),
  A4: require('../../public/note/A1.png'),
  B4: require('../../public/note/B.png'),
  C5: require('../../public/note/C5.png'),
  D5: require('../../public/note/D5.png'),
};

const BASS_NOTE_IMAGES = {
  E: require('../../public/note/E.png'),
  F: require('../../public/note/F.png'),
  G: require('../../public/note/G.png'),
  A: require('../../public/note/A.png'),
  B: require('../../public/note/B.png'),
  C: require('../../public/note/C.png'),
  D: require('../../public/note/D.png'),
  E2: require('../../public/note/E2.png'),
  F2: require('../../public/note/F2.png'),
  G2: require('../../public/note/G2.png'),
  A2: require('../../public/note/A2.png'),
};

const CHORD_IMAGES = {
  'C Major': require('../../public/note/CMajor.png'),
  'G Major': require('../../public/note/GMajor.png'),
  'A Minor': require('../../public/note/AMinor.png'),
};



function StaffCard({ note, mode }) {
  const image =
    mode === 'Chords'
      ? CHORD_IMAGES[note]
      : mode === 'Bass'
        ? BASS_NOTE_IMAGES[note]
        : NOTE_IMAGES[note];

  return (
    <View style={{ width: '100%', minHeight: 220, backgroundColor: '#d8d8d8', borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {image ? (
        <Image source={image} resizeMode="contain" style={{ width: 700, height: 220, alignSelf: 'center' }} />
      ) : (
        <Text style={{ color: '#555555', fontSize: 16 }}>
          {mode === 'Chords' ? `${note} chord image coming soon` : `${note} image coming soon`}
        </Text>
      )}
    </View>
  );
}

function MusicLesson({ onNavigate }) {
  const [index, setIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState(TREBLE_QUESTIONS);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [complete, setComplete] = useState(false);
  const [savePromptResult, setSavePromptResult] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('Treble');
  const [lessonStarted, setLessonStarted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const resultSaved = useRef(false);
  const answerLock = useRef(false);
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(16)).current;
  const feedbackScale = useRef(new Animated.Value(1)).current;
  const answerScale = useRef(new Animated.Value(1)).current;
  const cardShake = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(1)).current;
  const streakScale = useRef(new Animated.Value(1)).current;
  const bonusOpacity = useRef(new Animated.Value(0)).current;
  const bonusTranslateY = useRef(new Animated.Value(8)).current;
  const modalScale = useRef(new Animated.Value(0.88)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const QUESTIONS = shuffledQuestions;
  const question = QUESTIONS[index];
  const progress = ((index + (selected !== null ? 1 : 0)) / QUESTIONS.length) * 100;

  const stopAnimations = () => {
    [cardScale, cardOpacity, cardTranslateY, feedbackScale, answerScale, cardShake, progressAnim, scoreScale, streakScale, bonusOpacity, bonusTranslateY, modalScale, modalOpacity].forEach((animation) => animation.stopAnimation());
  };

  const resetAnimations = () => {
    stopAnimations();
    cardScale.setValue(0.94);
    cardOpacity.setValue(0);
    cardTranslateY.setValue(16);
    feedbackScale.setValue(1);
    answerScale.setValue(1);
    cardShake.setValue(0);
    progressAnim.setValue(0);
    scoreScale.setValue(1);
    streakScale.setValue(1);
    bonusOpacity.setValue(0);
    bonusTranslateY.setValue(8);
    modalScale.setValue(0.88);
    modalOpacity.setValue(0);
  };

  const selectLesson = (newMode) => {
    resetAnimations();
    answerLock.current = false;
    resultSaved.current = false;
    setMode(newMode);
    setIndex(0);
    setScore(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setSelected(null);
    setComplete(false);
    setSavePromptResult(null);
    setError('');
    setStreak(0);
    setBestStreak(0);
    setLessonStarted(true);
    setShuffledQuestions(shuffleQuestions({ Treble: TREBLE_QUESTIONS, Bass: BASS_QUESTIONS, Chords: CHORD_QUESTIONS }[newMode]));
  };

  useEffect(() => {
    if (!lessonStarted || complete) return undefined;

    cardScale.setValue(0.94);
    cardOpacity.setValue(0);
    cardTranslateY.setValue(16);
    feedbackScale.setValue(1);
    answerScale.setValue(1);
    cardShake.setValue(0);
    bonusOpacity.setValue(0);
    bonusTranslateY.setValue(8);

    const animation = Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, speed: 18, bounciness: 4, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [index, mode, lessonStarted, complete, cardScale, cardOpacity, cardTranslateY, feedbackScale, answerScale, cardShake, bonusOpacity, bonusTranslateY]);

  useEffect(() => {
    if (!lessonStarted) return undefined;

    const animation = Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start();
    return () => animation.stop();
  }, [progress, lessonStarted, progressAnim]);

  useEffect(() => {
    if (score === 0) return undefined;

    scoreScale.setValue(1);
    const animation = Animated.sequence([
      Animated.timing(scoreScale, { toValue: 1.16, duration: 100, useNativeDriver: true }),
      Animated.spring(scoreScale, { toValue: 1, speed: 20, bounciness: 5, useNativeDriver: true }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [score, scoreScale]);

  useEffect(() => {
    if (streak < 2) return undefined;

    streakScale.setValue(0.8);
    const animation = Animated.spring(streakScale, { toValue: 1, speed: 18, bounciness: 8, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [streak, streakScale]);

  useEffect(() => {
    if (!complete || savePromptResult) return undefined;

    modalScale.setValue(0.88);
    modalOpacity.setValue(0);

    const animation = Animated.parallel([
      Animated.spring(modalScale, { toValue: 1, speed: 16, bounciness: 5, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [complete, savePromptResult, modalScale, modalOpacity]);

  useEffect(() => {
    if (selected === null || !lessonStarted) return undefined;

    const timer = setTimeout(() => {
      answerLock.current = false;

      if (index + 1 < QUESTIONS.length) {
        setIndex((current) => current + 1);
        setSelected(null);
      } else {
        setComplete(true);
      }
    }, 850);

    return () => clearTimeout(timer);
  }, [selected, index, QUESTIONS.length, lessonStarted]);

  useEffect(() => {
    if (!complete || resultSaved.current) return;
    resultSaved.current = true;

    const result = { score, notesPressed: correctCount + incorrectCount, perfect: score === QUESTIONS.length * 100 };

    const saveResult = async () => {
      try {
        if (auth.currentUser) {
          await recordGameResult('pianoLesson', result);
        } else {
          const guestResultId = await recordGuestGameResult('pianoLesson', result);
          setSavePromptResult({ ...result, guestResultId });
        }
      } catch (saveError) {
        setError(saveError.message || 'Could not save this lesson result.');
      }
    };

    saveResult();
  }, [complete, score, correctCount, incorrectCount, QUESTIONS.length]);

  const answerQuestion = (option) => {
    if (answerLock.current || selected !== null || complete || !question) return;

    answerLock.current = true;
    setSelected(option);

    answerScale.setValue(0.88);
    Animated.spring(answerScale, { toValue: 1, speed: 20, bounciness: 8, useNativeDriver: true }).start();

    if (option === question.answer) {
      const nextStreak = streak + 1;
      setScore((current) => current + 100);
      setCorrectCount((current) => current + 1);
      setStreak(nextStreak);
      setBestStreak((current) => Math.max(current, nextStreak));

      feedbackScale.setValue(1);
      Animated.sequence([
        Animated.timing(feedbackScale, { toValue: 1.025, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(feedbackScale, { toValue: 1, speed: 20, bounciness: 6, useNativeDriver: true }),
      ]).start();

      bonusOpacity.setValue(0);
      bonusTranslateY.setValue(8);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(bonusOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.delay(350),
          Animated.timing(bonusOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        Animated.timing(bonusTranslateY, { toValue: -12, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else {
      setIncorrectCount((current) => current + 1);
      setStreak(0);
      cardShake.setValue(0);

      Animated.sequence([
        Animated.timing(cardShake, { toValue: -6, duration: 40, useNativeDriver: true }),
        Animated.timing(cardShake, { toValue: 6, duration: 40, useNativeDriver: true }),
        Animated.timing(cardShake, { toValue: -4, duration: 40, useNativeDriver: true }),
        Animated.timing(cardShake, { toValue: 4, duration: 40, useNativeDriver: true }),
        Animated.spring(cardShake, { toValue: 0, speed: 24, bounciness: 3, useNativeDriver: true }),
      ]).start();
    }
  };

  const restart = () => {
    resetAnimations();
    answerLock.current = false;
    resultSaved.current = false;
    setIndex(0);
    setScore(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setSelected(null);
    setComplete(false);
    setSavePromptResult(null);
    setError('');
    setStreak(0);
    setBestStreak(0);
    setShuffledQuestions(shuffleQuestions({ Treble: TREBLE_QUESTIONS, Bass: BASS_QUESTIONS, Chords: CHORD_QUESTIONS }[mode]));
  };


const backToLessons = () => {
  if (!lessonStarted) return;

  answerLock.current = false;
  setSelected(null);
  setComplete(false);

  Animated.parallel([
    Animated.timing(cardScale, {
      toValue: 0.88,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(cardOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }),
    Animated.timing(cardTranslateY, {
      toValue: 18,
      duration: 220,
      useNativeDriver: true,
    }),
  ]).start(({ finished }) => {
    if (finished) setLessonStarted(false);
  });
};


  const feedbackText = selected === null
    ? 'TAP THE CORRECT NOTE'
    : selected === question.answer
      ? streak > 1 ? `CORRECT! +100  •  ${streak} STREAK` : 'CORRECT! +100 POINTS'
      : `NOT QUITE — ANSWER: ${question.answer}`;

  const feedbackColor = selected === null ? '#d4af37' : selected === question.answer ? '#d4af37' : '#ff6464';

  return (
    <>
      {!lessonStarted ? (
        <Page backgroundImage={require('../../public/assets/glowing-musical-pentagram-background-with-sound-notes_1017-31220.avif')} overlayColor="rgba(1, 1, 58, 0.8)" style={{ justifyContent: 'center' }} contentStyle={{ maxWidth: 420 }}>
          <BackButton onPress={() => onNavigate('playmenu')} />
          <PianoLessonMenu onSelectLesson={selectLesson} />
        </Page>
      ) : (
        <Page style={{ backgroundColor: '#121212', justifyContent: 'center', paddingHorizontal: 12, paddingTop: 64 }} contentStyle={{ maxWidth: 380 }}>
          <BackButton label="‹  Back to Lessons" onPress={backToLessons} style={{ top: -54 }} />

          <View style={{ width: '100%', minHeight: 650, padding: 20, borderRadius: 30, backgroundColor: '#000000', borderWidth: 1, borderColor: '#333333' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: '#333333' }}>
              <Text style={{ color: '#8e8e93', fontSize: 13, fontWeight: '600' }}>Question {index + 1}/{QUESTIONS.length}</Text>
              <Animated.Text style={{ color: '#d4af37', fontSize: 13, fontWeight: '700', letterSpacing: 0.5, transform: [{ scale: scoreScale }] }}>SCORE: {score}</Animated.Text>
            </View>

            <View accessibilityRole="progressbar" accessibilityLabel="Lesson progress" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }} style={{ height: 3, width: '100%', marginTop: 10, backgroundColor: '#292929', borderRadius: 3, overflow: 'hidden' }}>
              <Animated.View style={{ height: '100%', width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: '#d4af37', borderRadius: 3 }} />
            </View>

            <Text style={{ color: '#cccccc', fontSize: 14, textAlign: 'center', marginTop: 22, marginBottom: 12 }}>What note is this?</Text>

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Animated.View style={{ transform: [{ translateX: cardShake }] }}>
                <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardTranslateY }, { scale: cardScale }, { scale: feedbackScale }] }}>
                  <StaffCard note={question.note} mode={mode} />
                </Animated.View>
                <Animated.Text pointerEvents="none" style={{ position: 'absolute', top: 12, right: 12, color: '#d4af37', fontSize: 20, fontWeight: '900', opacity: bonusOpacity, transform: [{ translateY: bonusTranslateY }] }}>+100</Animated.Text>
              </Animated.View>
            </View>

            <View style={{ width: '100%', flexDirection: 'row', marginTop: 20, marginBottom: 16 }}>
              {question.options.map((option, optionIndex) => {
                const chosen = selected === option;
                const correct = option === question.answer;

                return (
                  <Animated.View key={`${option}-${optionIndex}`} style={{ flex: 1, marginHorizontal: 5, transform: [{ scale: chosen ? answerScale : 1 }] }}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Answer ${option}`} accessibilityState={{ disabled: selected !== null, selected: chosen }} disabled={selected !== null} onPress={() => answerQuestion(option)} style={{ minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: chosen ? correct ? '#8b8000' : '#8b0000' : '#2a2a2a', borderWidth: 1, borderColor: chosen ? correct ? '#d4af37' : '#ff4d4d' : '#444444', opacity: selected !== null && !chosen ? 0.55 : 1, shadowColor: chosen ? correct ? '#d4af37' : '#ff4d4d' : 'transparent', shadowOpacity: chosen ? 0.65 : 0, shadowRadius: chosen ? 8 : 0, elevation: chosen ? 5 : 0 }}>
                      <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '800' }}>{option}</Text>
                      {chosen ? <Text style={{ position: 'absolute', right: 5, top: 3, color: '#ffffff', fontSize: 11, fontWeight: '900' }}>{correct ? '✓' : '×'}</Text> : null}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>

            <Animated.Text accessibilityLiveRegion="polite" style={{ color: feedbackColor, fontSize: 12, fontWeight: '700', letterSpacing: 0.7, textAlign: 'center', marginBottom: 8, transform: [{ scale: selected !== null ? answerScale : 1 }] }}>{feedbackText}</Animated.Text>
            {streak > 1 && selected !== null && selected === question.answer ? (
              <Animated.Text style={{ color: '#d4af37', fontSize: 11, textAlign: 'center', marginBottom: 6, transform: [{ scale: streakScale }] }}>🔥 {streak} CORRECT IN A ROW</Animated.Text>
            ) : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          </View>

          <Modal animationType="fade" onRequestClose={() => {}} transparent visible={complete && !savePromptResult}>
            <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.75)' }}>
              <Animated.View style={{ opacity: modalOpacity, transform: [{ scale: modalScale }] }}>
                <View style={[styles.card, { padding: 26, backgroundColor: '#1e1e1e', borderColor: '#d4af37', borderRadius: 16 }]}>
                  <Text style={{ color: '#d4af37', fontSize: 24, fontWeight: '800', textAlign: 'center' }}>LESSON COMPLETE!</Text>
                  <Text style={{ color: COLORS.muted, marginTop: 18 }}>Points earned: {score} / {QUESTIONS.length * 100}</Text>
                  <Text style={{ color: COLORS.muted, marginTop: 8 }}>Correct answers: {correctCount}</Text>
                  <Text style={{ color: COLORS.muted, marginTop: 8 }}>Incorrect answers: {incorrectCount}</Text>
                  <Text style={{ color: '#d4af37', marginTop: 8 }}>Best streak: {bestStreak}</Text>
                  {score === QUESTIONS.length * 100 ? <Text style={{ color: '#d4af37', marginTop: 14, textAlign: 'center', fontWeight: '800' }}>PERFECT LESSON!</Text> : null}
                  <AppButton title="Try again" onPress={restart} />
                </View>
              </Animated.View>
            </View>
          </Modal>

          {savePromptResult && <AccountSavePrompt mode="pianoLesson" result={savePromptResult} onNavigate={onNavigate} onDismiss={() => setSavePromptResult(null)} />}
        </Page>
      )}
    </>
  );
}

export default MusicLesson;