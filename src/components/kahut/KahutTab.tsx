import React, { useEffect, useRef, useState } from 'react';
import { EventConfig, KahutPhase, KahutQuestion as Question } from '../../types';
import KahutConfig from './KahutConfig';
import KahutPreview from './KahutPreview';
import KahutLobby from './KahutLobby';
import KahutQuestion from './KahutQuestion';
import KahutFinish from './KahutFinish';
import { ImageMatch, revokeImages } from './matchImages';

interface Props {
  config: EventConfig;
  onUpdate: (config: Partial<EventConfig>) => void;
}

export default function KahutTab({ config, onUpdate }: Props) {
  const [phase, setPhase] = useState<KahutPhase>('CONFIG');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [imageMatch, setImageMatch] = useState<ImageMatch | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  /** undefined = not answered, null = timed out, number = chosen */
  const [answer, setAnswer] = useState<number | null | undefined>(undefined);

  const imageUrls = imageMatch?.urls ?? {};

  // Release object URLs when images are replaced or the tab unmounts.
  const lastMatch = useRef<ImageMatch | null>(null);
  useEffect(() => {
    if (lastMatch.current && lastMatch.current !== imageMatch) revokeImages(lastMatch.current.urls);
    lastMatch.current = imageMatch;
  }, [imageMatch]);
  useEffect(() => () => {
    if (lastMatch.current) revokeImages(lastMatch.current.urls);
  }, []);

  const startGame = () => {
    setIndex(0);
    setScore(0);
    setResults([]);
    setAnswer(undefined);
    setPhase('QUESTION');
  };

  const handleAnswer = (choice: number | null) => {
    const q = questions[index];
    if (!q) return;
    setAnswer(choice);
    const correct = choice !== null && choice === q.correctIndex;
    if (correct) setScore(s => s + 1);
    setResults(r => [...r, correct]);
    setPhase('REVEAL');
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setPhase('FINISH');
      return;
    }
    setIndex(i => i + 1);
    setAnswer(undefined);
    setPhase('QUESTION');
  };

  const current = questions[index];

  return (
    <div className="min-h-screen w-full">
      {phase === 'CONFIG' && (
        <KahutConfig
          config={config}
          onUpdate={onUpdate}
          questions={questions}
          onQuestionsChange={setQuestions}
          imageMatch={imageMatch}
          onImagesChange={setImageMatch}
          onPreview={() => setPhase('PREVIEW')}
        />
      )}
      {phase === 'PREVIEW' && (
        <KahutPreview
          questions={questions}
          imageUrls={imageUrls}
          onBack={() => setPhase('CONFIG')}
          onRun={() => setPhase('LOBBY')}
        />
      )}
      {phase === 'LOBBY' && (
        <KahutLobby total={questions.length} onStart={startGame} onBack={() => setPhase('PREVIEW')} />
      )}
      {(phase === 'QUESTION' || phase === 'REVEAL') && current && (
        <KahutQuestion
          question={current}
          index={index}
          total={questions.length}
          score={score}
          results={results}
          imageUrl={imageUrls[current.id]}
          answer={answer}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />
      )}
      {phase === 'FINISH' && (
        <KahutFinish
          score={score}
          total={questions.length}
          onReplay={startGame}
          onBackToConfig={() => setPhase('CONFIG')}
        />
      )}
    </div>
  );
}
