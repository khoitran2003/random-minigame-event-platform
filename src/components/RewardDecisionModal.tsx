import React, { useState } from 'react';
import { Participant, Prize } from '../types';
import { Check, X, UserMinus, UserCheck } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface Props {
  winner: Participant;
  prize: Prize;
  onAccept: () => void;
  onRejectKeep: () => void;
  onRejectRemove: () => void;
}

export default function RewardDecisionModal({ winner, prize, onAccept, onRejectKeep, onRejectRemove }: Props) {
  const [rejectStep, setRejectStep] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1A102E] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{t('modal.title')}</h2>
          <p className="text-white/60 mb-6">{t('modal.desc')}</p>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-left">
            <div className="mb-4">
              <span className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">{t('modal.prizeLabel')}</span>
              <span className="block text-lg font-medium text-white">{prize?.name || 'Unknown Prize'}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">{t('modal.winnerIdLabel')}</span>
                <span className="block text-lg font-medium text-white">{winner.ids}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">{t('modal.winnerNameLabel')}</span>
                <span className="block text-lg font-medium text-white">{winner.name}</span>
              </div>
            </div>
          </div>

          {!rejectStep ? (
            <div className="flex gap-4">
              <button
                onClick={() => setRejectStep(true)}
                className="flex-1 py-3 px-4 flex items-center justify-center gap-2 rounded-xl font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
                title={t('modal.rejectBtn')}
              >
                <X size={18} />
                {t('modal.rejectBtn')}
              </button>
              <button
                onClick={onAccept}
                className="flex-1 py-3 px-4 flex items-center justify-center gap-2 rounded-xl font-medium bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 transition-all"
              >
                <Check size={18} />
                {t('modal.acceptBtn')}
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-sm text-white/80 mb-4 font-medium">{t('modal.rejectQuestion')}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={onRejectKeep}
                  className="w-full py-3 px-4 flex items-center justify-center gap-3 rounded-xl font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <UserCheck size={18} className="text-orange-400" />
                  {t('modal.keepBtn')}
                </button>
                <button
                  onClick={onRejectRemove}
                  className="w-full py-3 px-4 flex items-center justify-center gap-3 rounded-xl font-medium border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  <UserMinus size={18} />
                  {t('modal.removeBtn')}
                </button>
                <button
                  onClick={() => setRejectStep(false)}
                  className="mt-2 text-sm text-white/40 hover:text-white/60 transition-colors"
                >
                  {t('modal.cancelBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
