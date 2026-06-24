import React from 'react';
import { RewardLogEntry } from '../types';
import { X, Download } from 'lucide-react';
import Papa from 'papaparse';
import { useLanguage } from '../LanguageContext';

interface Props {
  rewardLog: RewardLogEntry[];
  onClose: () => void;
}

export default function RewardLogModal({ rewardLog, onClose }: Props) {
  const { t, lang, setLang } = useLanguage();
  const exportToCSV = () => {
    if (rewardLog.length === 0) return;
    const exportData = rewardLog.map((log, index) => ({
      ...log,
      id: index + 1
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reward_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1A102E] border border-white/10 rounded-2xl p-6 md:p-8 max-w-6xl w-full shadow-2xl relative flex flex-col max-h-[85vh]">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{t('log.title')}</h2>
            <p className="text-sm text-white/50">{t('log.desc')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors text-sm font-medium"
            >
              {lang === 'en' ? 'VI' : 'EN'}
            </button>
            <button
              onClick={exportToCSV}
              disabled={rewardLog.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium border transition-all ${
                rewardLog.length === 0
                  ? 'bg-transparent text-white/40 border-white/5 cursor-not-allowed'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30'
              }`}
            >
              <Download className="w-4 h-4" /> {t('log.export')}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="relative z-10 bg-black/20 rounded-xl overflow-hidden border border-white/10 overflow-auto flex-1">
          <table className="w-full text-left text-sm text-white">
            <thead className="text-xs text-white/60 bg-black/40 uppercase sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4">{t('log.time')}</th>
                <th className="px-6 py-4">{t('config.eventName')}</th>
                <th className="px-6 py-4">{t('log.game')}</th>
                <th className="px-6 py-4">{t('log.prize')}</th>
                <th className="px-6 py-4">{t('log.id')}</th>
                <th className="px-6 py-4">{t('log.name')}</th>
                <th className="px-6 py-4">{t('log.status')}</th>
              </tr>
            </thead>
            <tbody>
              {rewardLog.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                    {t('log.empty')}
                  </td>
                </tr>
              ) : (
                rewardLog.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap truncate max-w-[150px]">{log.eventName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.gameType}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.prize}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono">{log.winnerId}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.winnerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                        log.status === 'Accepted'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : log.status === 'Rejected (Kept)'
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {log.status === 'Accepted' ? t('status.accepted') : log.status === 'Rejected (Kept)' ? t('status.rejectedKeep') : t('status.rejectedRemove')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
