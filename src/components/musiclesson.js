import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { recordGameResult, recordGuestGameResult } from '../achievements';
import { auth } from '../firebase';
import AccountSavePrompt from './AccountSavePrompt';
import { AppButton, BackButton, COLORS, Page, styles } from './native';

const QUESTIONS = [
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

const NOTE_POSITIONS = {
  C4: 5,
  D4: 4.5,
  E4: 4,
  F4: 3.5,
  G4: 3,
  A4: 2.5,
  B4: 2,
  C5: 1.5,
  D5: 1,
};

function StaffCard({ note }) {
  const y = (NOTE_POSITIONS[note] || 3) * 25;
  return (
    <View style={{ width: '100%', minHeight: 220, backgroundColor: '#d8d8d8', borderRadius: 8, overflow: 'hidden' }}>
      {[35, 60, 85, 110, 135].map((top) => (
        <View key={top} style={{ position: 'absolute', left: '8%', right: '8%', top, height: 2, backgroundColor: '#15182a' }} />
      ))}
      <Text style={{ position: 'absolute', left: 18, top: 36, fontSize: 80, lineHeight: 100, color: '#15182a' }}>𝄞</Text>
      <View style={{
        position: 'absolute',
        left: '61%',
        top: y,
        width: 19,
        height: 13,
        borderRadius: 10,
        backgroundColor: '#15182a',
        transform: [{ rotate: '-20deg' }],
      }} />
      <View style={{ position: 'absolute', left: '66%', top: y - 38, height: 40, width: 2, backgroundColor: '#15182a' }} />
      {note === 'C4' && (
        <View style={{ position: 'absolute', left: '57%', top: y + 5, width: 37, height: 2, backgroundColor: '#15182a' }} />
      )}
    </View>
  );
}

function MusicLesson({ onNavigate }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [complete, setComplete] = useState(false);
  const [savePromptResult, setSavePromptResult] = useState(null);
  const [error, setError] = useState('');
  const resultSaved = useRef(false);
  const question = QUESTIONS[index];

  useEffect(() => {
    if (selected === null) return undefined;
    const timer = setTimeout(() => {
      if (index + 1 < QUESTIONS.length) {
        setIndex((current) => current + 1);
        setSelected(null);
      } else {
        setComplete(true);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [selected, index]);

  useEffect(() => {
    if (!complete || resultSaved.current) return;
    resultSaved.current = true;
    const result = {
      score,
      notesPressed: correctCount + incorrectCount,
      perfect: score === QUESTIONS.length * 100,
    };
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
  }, [complete, score, correctCount, incorrectCount]);

  const answerQuestion = (option) => {
    if (selected !== null) return;
    setSelected(option);
    if (option === question.answer) {
      setScore((current) => current + 100);
      setCorrectCount((current) => current + 1);
    } else {
      setIncorrectCount((current) => current + 1);
    }
  };

  const restart = () => {
    resultSaved.current = false;
    setIndex(0);
    setScore(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setSelected(null);
    setComplete(false);
    setSavePromptResult(null);
    setError('');
  };

  return (
    <Page
      style={{ backgroundColor: '#121212', justifyContent: 'center', paddingHorizontal: 12, paddingTop: 64 }}
      contentStyle={{ maxWidth: 380 }}
    >
      <BackButton label="‹  Back to Play Menu" onPress={() => onNavigate('playmenu')} style={{ top: -54 }} />
      <View style={{
        width: '100%',
        minHeight: 650,
        padding: 20,
        borderRadius: 30,
        backgroundColor: '#000000',
        borderWidth: 1,
        borderColor: '#333333',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: '#333333' }}>
          <Text style={{ color: '#8e8e93', fontSize: 13, fontWeight: '600' }}>Question {index + 1}/{QUESTIONS.length}</Text>
          <Text style={{ color: '#d4af37', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>SCORE: {score}</Text>
        </View>
        <Text style={{ color: '#cccccc', fontSize: 14, textAlign: 'center', marginTop: 22, marginBottom: 12 }}>What note is this?</Text>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <StaffCard note={question.note} />
        </View>
        <View style={{ width: '100%', flexDirection: 'row', marginTop: 20, marginBottom: 16 }}>
          {question.options.map((option) => {
            const chosen = selected === option;
            const correct = chosen && option === question.answer;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                disabled={selected !== null}
                onPress={() => answerQuestion(option)}
                style={{
                  flex: 1,
                  minHeight: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: 5,
                  borderRadius: 8,
                  backgroundColor: chosen ? (correct ? '#8b8000' : '#8b0000') : '#2a2a2a',
                  borderWidth: 1,
                  borderColor: chosen ? (correct ? '#d4af37' : '#ff4d4d') : '#444444',
                  opacity: selected !== null && !chosen ? 0.55 : 1,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '800' }}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: '#d4af37', fontSize: 12, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginBottom: 8 }}>TAP THE CORRECT NOTE</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>

      <Modal animationType="fade" onRequestClose={() => {}} transparent visible={complete && !savePromptResult}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <View style={[styles.card, { padding: 26, backgroundColor: '#1e1e1e', borderColor: '#d4af37', borderRadius: 16 }]}>
            <Text style={{ color: '#d4af37', fontSize: 24, fontWeight: '800', textAlign: 'center' }}>LESSON COMPLETE!</Text>
            <Text style={{ color: COLORS.muted, marginTop: 18 }}>Points earned: {score} / {QUESTIONS.length * 100}</Text>
            <Text style={{ color: COLORS.muted, marginTop: 8 }}>Correct answers: {correctCount}</Text>
            <Text style={{ color: COLORS.muted, marginTop: 8 }}>Incorrect answers: {incorrectCount}</Text>
            <AppButton title="Try again" onPress={restart} />
          </View>
        </View>
      </Modal>
      {savePromptResult && (
        <AccountSavePrompt
          mode="pianoLesson"
          result={savePromptResult}
          onNavigate={onNavigate}
          onDismiss={() => setSavePromptResult(null)}
        />
      )}
    </Page>
  );
}

export default MusicLesson;
