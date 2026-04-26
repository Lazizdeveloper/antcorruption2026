import { motion } from 'motion/react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MeritQuestion } from '../types';

interface MeritTestProps {
  busy: boolean;
  onComplete: (answers: number[]) => void;
  questions: MeritQuestion[];
}

export function MeritTest({ busy, onComplete, questions }: MeritTestProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  useEffect(() => {
    setCurrentQuestion(0);
    setAnswers([]);
  }, [questions]);

  if (questions.length === 0) {
    return (
      <div className="bg-[#080808] rounded-3xl p-12 border border-zinc-800/50 shadow-2xl max-w-3xl mx-auto text-center">
        <h3 className="text-2xl font-serif italic text-zinc-300">Merit savollari hozircha mavjud emas</h3>
      </div>
    );
  }

  const handleAnswer = (answerIndex: number) => {
    if (busy) {
      return;
    }

    const nextAnswers = [...answers, answerIndex + 1];

    if (currentQuestion < questions.length - 1) {
      setAnswers(nextAnswers);
      setCurrentQuestion((prev) => prev + 1);
      return;
    }

    onComplete(nextAnswers);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-zinc-800/50 bg-[#080808] p-6 shadow-2xl sm:p-8 md:p-12"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="relative z-10 mb-8 flex flex-col gap-3 border-b border-zinc-800/30 pb-6 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest">Merit Baholash Jarayoni</span>
        </div>
        <span className="text-xs font-mono text-zinc-700 tracking-widest uppercase">
          {busy ? 'Yuborilmoqda...' : `Savol ${currentQuestion + 1} / ${questions.length}`}
        </span>
      </div>

      <h3 className="text-2xl font-serif italic text-zinc-300 mb-10 leading-relaxed relative z-10">
        "{questions[currentQuestion].question}"
      </h3>

      <div className="grid grid-cols-1 gap-4 relative z-10">
        {questions[currentQuestion].options.map((option, index) => (
          <button
            key={`${questions[currentQuestion].id}-${index}`}
            onClick={() => handleAnswer(index)}
            disabled={busy}
            className="group flex w-full flex-col gap-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-5 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 disabled:opacity-60 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <span className="text-lg text-zinc-500 group-hover:text-zinc-200 transition-colors font-medium">{option}</span>
            {busy ? <Loader2 size={20} className="animate-spin text-emerald-500" /> : <ArrowRight size={20} className="text-zinc-800 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all" />}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
