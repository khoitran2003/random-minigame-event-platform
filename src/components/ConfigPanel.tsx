import React, { useRef, useState } from 'react';
import { EventConfig, Participant, Prize } from '../types';
import { Settings, Image as ImageIcon, Users, Trophy, Play, FileUp, Download, Languages, RotateCcw } from 'lucide-react';
import Papa from 'papaparse';
import { useLanguage } from '../LanguageContext';

interface Props {
  config: EventConfig;
  onUpdate: (config: Partial<EventConfig>) => void;
  onLaunch: () => void;
}

export default function ConfigPanel({ config, onUpdate, onLaunch }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [csvError, setCsvError] = useState<string>('');
  const [csvSuccess, setCsvSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'LOG'>('CONFIG');
  const [nameError, setNameError] = useState<boolean>(false);
  const [showRemovedList, setShowRemovedList] = useState<boolean>(true);
  const { t, lang, setLang } = useLanguage();

  const removedParticipants = React.useMemo(() => {
    const remainingIds = new Set(config.remainingParticipants.map(p => p.ids));
    return config.participants.filter(p => !remainingIds.has(p.ids));
  }, [config.participants, config.remainingParticipants]);

  const getRemovalReason = (participantId: string) => {
    const log = config.rewardLog.find(l => l.winnerId === participantId && l.isRemovedFromPool);
    if (!log) return '-';
    if (log.status === 'Accepted') {
      return `${t('status.accepted')}: ${log.prize}`;
    }
    if (log.status === 'Rejected (Removed)') {
      return t('status.rejectedRemove');
    }
    return log.status;
  };

  const exportToCSV = () => {
    if (config.rewardLog.length === 0) return;
    const exportData = config.rewardLog.map((log, index) => ({
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

  const clearLogsAndResetPool = () => {
    if (window.confirm(lang === 'en' ? 'Are you sure you want to clear all logs and put all participants back in the active pool?' : 'Bạn có chắc chắn muốn xóa tất cả lịch sử và đưa tất cả người tham gia trở lại danh sách bốc thăm?')) {
      onUpdate({
        rewardLog: [],
        remainingParticipants: [...config.participants]
      });
    }
  };

  const handleBgFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onUpdate({ backgroundUrl: e.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvError('');
    setCsvSuccess('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setCsvError(t('config.csvErrorParsing'));
          return;
        }

        const data = results.data as any[];
        // Validate headers: must contain "ids" and "name"
        if (data.length > 0 && !('ids' in data[0]) && !('name' in data[0])) {
          setCsvError(t('config.csvErrorHeader'));
          return;
        }

        const validParticipants = data
          .filter(row => row.ids && row.name)
          .map(row => ({
            ids: String(row.ids).trim(),
            name: String(row.name).trim(),
            ...row
          })) as Participant[];

        if (validParticipants.length === 0) {
          setCsvError(t('config.csvErrorNoParticipants'));
          return;
        }

        const previouslyWonIds = new Set(
          config.rewardLog.filter(log => log.isAccepted).map(log => log.winnerId)
        );
        const newRemaining = validParticipants.filter(p => !previouslyWonIds.has(p.ids));

        onUpdate({ 
          participants: validParticipants,
          remainingParticipants: newRemaining
        });
        setCsvSuccess(t('config.uploadSuccess', { count: validParticipants.length }));
      },
      error: () => {
        setCsvError(t('config.csvErrorRead'));
      }
    });
  };

  const addPrize = () => {
    const newPrize: Prize = {
      id: Date.now().toString(),
      name: t('config.prizeTier', { number: config.prizes.length + 1 }),
      count: 1
    };
    onUpdate({ prizes: [...config.prizes, newPrize] });
  };

  const updatePrize = (id: string, updates: Partial<Prize>) => {
    const newPrizes = config.prizes.map(p => p.id === id ? { ...p, ...updates } : p);
    onUpdate({ prizes: newPrizes });
  };

  const removePrize = (id: string) => {
    onUpdate({ prizes: config.prizes.filter(p => p.id !== id) });
  };

  const loadSampleList = () => {
    const samples: Participant[] = Array.from({ length: 100 }, (_, i) => {
      const num = (i + 1).toString().padStart(4, '0');
      return {
        ids: `P${num}`,
        name: lang === 'en' ? `Player ${num}` : `Người chơi ${num}`
      };
    });
    onUpdate({
      participants: samples,
      remainingParticipants: samples
    });
    setCsvSuccess(t('config.uploadSuccess', { count: samples.length }));
    setCsvError('');
  };

  const isReadyToLaunch = config.participants.length > 0;

  const handleLaunchClick = () => {
    if (config.eventName.trim() === '') {
      setNameError(true);
      return;
    }
    onLaunch();
  };

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 h-20 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl lg:text-[36px] font-bold flex items-center gap-3 text-white">
            <Settings className="w-8 h-8 text-[#FFD700]" />
            {t('config.title')}
          </h1>
          <button
            onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all text-sm font-medium"
          >
            <Languages className="w-4 h-4" />
            {lang === 'en' ? 'VI' : 'EN'}
          </button>
        </div>
        <button
          onClick={handleLaunchClick}
          disabled={!isReadyToLaunch}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] ${
            isReadyToLaunch
              ? 'bg-transparent text-white border border-white/10 hover:border-white/20 hover:bg-white/5'
              : 'bg-transparent text-white/40 border border-white/5 cursor-not-allowed'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          {t('config.continue')}
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('CONFIG')}
          className={`px-6 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'CONFIG'
              ? 'bg-white/10 text-white border-white/20'
              : 'bg-transparent text-white/40 border-transparent hover:text-white/80 hover:bg-white/5'
          }`}
        >
          {t('config.basic')}
        </button>
        <button
          onClick={() => setActiveTab('LOG')}
          className={`px-6 py-2 rounded-xl font-bold transition-all border ${
            activeTab === 'LOG'
              ? 'bg-white/10 text-white border-white/20'
              : 'bg-transparent text-white/40 border-transparent hover:text-white/80 hover:bg-white/5'
          }`}
        >
          {t('game.rewardLog')}
        </button>
      </div>

      {/* Main Panel Container */}
      <div className="liquid-glass-dark rounded-2xl p-6 lg:p-8">
        {activeTab === 'CONFIG' ? (
        <div className="flex flex-col gap-8 w-full">
          
          {/* Top section: Info config grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left side: Event Name & Background Styling */}
            <div className="flex flex-col gap-6">
              {/* Event Name */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-[14px] font-medium text-white">
                  <Settings className="w-4 h-4" /> {t('config.eventName')}
                </label>
                <input
                  type="text"
                  value={config.eventName}
                  onChange={(e) => {
                    onUpdate({ eventName: e.target.value });
                    if (nameError) setNameError(false);
                  }}
                  placeholder={t('config.eventNamePlaceholder')}
                  className={`bg-black/30 text-white text-[16px] px-4 py-3 rounded-xl border focus:outline-none transition-all h-[50px] placeholder:text-white/50 ${
                    nameError 
                      ? 'blinking-error' 
                      : 'border-white/20 focus:border-white/40 focus:ring-3 focus:ring-[#1E90FF]/20'
                  }`}
                />
              </div>

              {/* Background Image / Color */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-[14px] font-medium text-white">
                  <ImageIcon className="w-4 h-4" /> {t('config.backgroundStyling')}
                </label>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      ref={bgFileInputRef}
                      onChange={handleBgFileUpload}
                      className="hidden"
                    />
                    <div className="flex-1 flex gap-2">
                      <button
                        onClick={() => bgFileInputRef.current?.click()}
                        className="bg-white/10 text-white text-[14px] px-4 py-3 rounded-xl border border-white/20 hover:bg-white/15 transition-all h-[50px] whitespace-nowrap"
                      >
                        {t('config.uploadImage')}
                      </button>
                      <input
                        type="text"
                        value={config.backgroundUrl}
                        onChange={(e) => onUpdate({ backgroundUrl: e.target.value })}
                        placeholder={t('config.orImageUrl')}
                        className="flex-1 bg-black/30 text-white text-[14px] px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:border-white/40 focus:ring-3 focus:ring-[#1E90FF]/20 transition-all h-[50px] placeholder:text-white/50"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[14px] text-white/80 shrink-0">{t('config.orColor')}</span>
                      <input
                        type="color"
                        value={config.backgroundColor}
                        onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                        className="w-12 h-[50px] bg-black/30 rounded-xl border border-white/20 cursor-pointer p-1"
                      />
                    </div>
                  </div>

                  {/* Blur Slider */}
                  <div className="flex flex-col gap-3 bg-black/20 p-4 rounded-xl border border-white/10">
                    <div className="flex items-center gap-4">
                      <span className="text-[14px] text-white/80 shrink-0 w-28">{t('config.blurAmount')}</span>
                      <input
                        type="range"
                        min="0"
                        max="40"
                        value={config.backgroundBlur}
                        onChange={(e) => onUpdate({ backgroundBlur: parseInt(e.target.value) })}
                        className="flex-1 accent-[#1E90FF] cursor-pointer"
                      />
                      <span className="text-[14px] text-white/80 w-8 text-right">{config.backgroundBlur}px</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[14px] text-white/80 shrink-0 w-28">{t('config.darkenOverlay')}</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={config.backgroundOverlayOpacity}
                        onChange={(e) => onUpdate({ backgroundOverlayOpacity: parseInt(e.target.value) })}
                        className="flex-1 accent-[#1E90FF] cursor-pointer"
                      />
                      <span className="text-[14px] text-white/80 w-8 text-right">{config.backgroundOverlayOpacity}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Prizes Setup */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-[14px] font-medium text-white">
                    <Trophy className="w-4 h-4" /> {t('config.prizesSetup')}
                  </label>
                  <button 
                    onClick={addPrize}
                    className="bg-white/10 text-white text-[12px] font-medium px-3 py-1 rounded-lg hover:bg-white/15 transition-colors h-6"
                  >
                    + {t('config.addPrize')}
                  </button>
                </div>
                
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {config.prizes.map((prize, index) => (
                    <div key={prize.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center liquid-glass p-3 rounded-xl">
                      <span className="text-white/50 w-6 font-mono text-[14px]">#{index + 1}</span>
                      <input
                        type="text"
                        value={prize.name}
                        onChange={(e) => updatePrize(prize.id, { name: e.target.value })}
                        placeholder={t('config.prizeName')}
                        className="flex-1 w-full bg-black/30 text-white text-[14px] px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-white/40 focus:ring-3 focus:ring-[#1E90FF]/20 h-10"
                      />
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-white/80 text-[14px]">{t('config.qty')}</span>
                        <input
                          type="number"
                          min="1"
                          value={prize.count === 0 ? '' : prize.count}
                          onChange={(e) => {
                            const val = e.target.value;
                            updatePrize(prize.id, { count: val === '' ? 0 : Math.max(0, parseInt(val, 10)) });
                          }}
                          onBlur={() => {
                            if (!prize.count || prize.count <= 0) {
                              updatePrize(prize.id, { count: 1 });
                            }
                          }}
                          className="w-20 bg-black/30 text-white text-[14px] px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-white/40 focus:ring-3 focus:ring-[#1E90FF]/20 h-10"
                        />
                        {config.prizes.length > 1 && (
                          <button
                            onClick={() => removePrize(prize.id)}
                            className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-[#FF6B35] hover:bg-white/10 transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-white/10 my-2" />

          {/* Bottom section: Participants List */}
          <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-[14px] font-medium text-white">
                <Users className="w-4 h-4" /> {t('config.participants')}
              </label>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-medium text-white/80 bg-white/10 px-3 py-1 rounded-lg h-6 flex items-center">
                  {t('config.count', { count: config.remainingParticipants.length })}
                </span>
                {config.participants.length > 0 && (
                  <button 
                    onClick={() => setShowRemovedList(!showRemovedList)}
                    className={`text-[12px] font-medium px-3 py-1 rounded-lg h-6 flex items-center transition-all cursor-pointer select-none ${
                      showRemovedList 
                        ? 'bg-red-500 text-white shadow-md shadow-red-500/20' 
                        : 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                    }`}
                  >
                    {t('config.removedCount', { count: removedParticipants.length })}
                  </button>
                )}
              </div>
            </div>
            
            <div className="liquid-glass rounded-xl p-5 flex-1 flex flex-col min-h-[300px] w-full">
              <div className="mb-4 flex flex-col sm:flex-row gap-3">
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white text-[16px] px-4 py-3 rounded-xl border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all h-[50px] cursor-pointer"
                >
                  <FileUp className="w-5 h-5" />
                  {t('config.uploadCsv')}
                </button>
                <button
                  onClick={loadSampleList}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-[16px] px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all h-[50px] cursor-pointer"
                >
                  {t('config.loadSample')}
                </button>
              </div>
              <p className="text-[12px] text-white/50 mt-1 mb-4 text-center">
                {t('config.csvFormat')}
              </p>

              {csvError && <div className="text-[#FF6B35] text-[14px] bg-[#FF6B35]/10 p-3 rounded-lg mb-4">{csvError}</div>}
              {csvSuccess && <div className="text-[#00C853] text-[14px] bg-[#00C853]/10 p-3 rounded-lg mb-4">{csvSuccess}</div>}

              <div className="flex-1 bg-black/30 rounded-xl border border-white/10 overflow-hidden flex flex-col w-full">
                {showRemovedList ? (
                  <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden">
                    {/* Left: Remaining List */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="bg-[#2A1F40]/50 px-4 py-2 border-b border-white/10 text-xs font-bold text-white/60 tracking-wider uppercase">
                        {t('config.remaining')}
                      </div>
                      {config.remainingParticipants.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-white/40 text-[14px] min-h-[150px]">
                          {t('config.csvPlaceholder')}
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto p-0 max-h-[250px]">
                          <table className="w-full text-left text-[12px] text-white/80 font-mono">
                            <thead className="sticky top-0 bg-[#2A1F40] shadow-md z-10">
                              <tr>
                                <th className="py-2 px-4 font-medium border-b border-white/10">{t('generic.id')}</th>
                                <th className="py-2 px-4 font-medium border-b border-white/10">{t('generic.name')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {config.remainingParticipants.slice(0, 50).map((p, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-2 px-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">{p.ids}</td>
                                  <td className="py-2 px-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{p.name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {config.remainingParticipants.length > 50 && (
                            <div className="p-2 text-center text-white/40 text-[12px] border-t border-white/5 bg-black/20">
                              {t('config.moreParticipants', { count: config.remainingParticipants.length - 50 })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Removed List */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="bg-[#2A1F40]/50 px-4 py-2 border-b border-white/10 text-xs font-bold text-white/60 tracking-wider uppercase">
                        {t('config.removed')}
                      </div>
                      {removedParticipants.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-white/40 text-[14px] min-h-[150px]">
                          No removed participants.
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto p-0 max-h-[250px]">
                          <table className="w-full text-left text-[12px] text-white/80 font-mono">
                            <thead className="sticky top-0 bg-[#2A1F40] shadow-md z-10">
                              <tr>
                                <th className="py-2 px-4 font-medium border-b border-white/10">{t('generic.id')}</th>
                                <th className="py-2 px-4 font-medium border-b border-white/10">{t('generic.name')}</th>
                                <th className="py-2 px-4 font-medium border-b border-white/10">{t('config.eventName')}</th>
                                <th className="py-2 px-4 font-medium border-b border-white/10">{t('generic.reason')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {removedParticipants.slice(0, 50).map((p, i) => {
                                const log = config.rewardLog.find(l => l.winnerId === p.ids && l.isRemovedFromPool);
                                const isAccepted = log?.status === 'Accepted';
                                const colorClass = isAccepted ? 'text-green-400' : 'text-red-400';
                                return (
                                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors text-white/40">
                                    <td className="py-2 px-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px] line-through">{p.ids}</td>
                                    <td className="py-2 px-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] line-through">{p.name}</td>
                                    <td className="py-2 px-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{log?.eventName || '-'}</td>
                                    <td className={`py-2 px-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] text-xs ${colorClass}`}>
                                      {getRemovalReason(p.ids)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {removedParticipants.length > 50 && (
                            <div className="p-2 text-center text-white/40 text-[12px] border-t border-white/5 bg-black/20">
                              + {removedParticipants.length - 50} more...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  config.remainingParticipants.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-white/40 text-[14px]">
                      {t('config.csvPlaceholder')}
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-0 max-h-[250px]">
                      <table className="w-full text-left text-[12px] text-white/80 font-mono">
                        <thead className="sticky top-0 bg-[#2A1F40] shadow-md z-10">
                          <tr>
                            <th className="py-2 px-4 font-medium border-b border-white/10">{t('generic.id')}</th>
                            <th className="py-2 px-4 font-medium border-b border-white/10">{t('generic.name')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {config.remainingParticipants.slice(0, 50).map((p, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-2 px-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">{p.ids}</td>
                              <td className="py-2 px-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{p.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {config.remainingParticipants.length > 50 && (
                        <div className="p-2 text-center text-white/40 text-[12px] border-t border-white/5 bg-black/20">
                          {t('config.moreParticipants', { count: config.remainingParticipants.length - 50 })}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

        </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-xl font-bold text-white">{t('log.title')}</h2>
                <p className="text-sm text-white/50">{t('log.desc')}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={clearLogsAndResetPool}
                  disabled={config.rewardLog.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium border transition-all ${
                    config.rewardLog.length === 0
                      ? 'bg-transparent text-white/40 border-white/5 cursor-not-allowed'
                      : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/35 cursor-pointer hover:scale-105 active:scale-95'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" /> {t('log.reset')}
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={config.rewardLog.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium border transition-all ${
                    config.rewardLog.length === 0
                      ? 'bg-transparent text-white/40 border-white/5 cursor-not-allowed'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30 cursor-pointer hover:scale-105 active:scale-95'
                  }`}
                >
                  <Download className="w-4 h-4" /> {t('log.export')}
                </button>
              </div>
            </div>

            <div className="bg-black/20 rounded-xl overflow-hidden border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-sm text-white">
                <thead className="text-xs text-white/60 bg-black/40 uppercase">
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
                  {config.rewardLog.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-white/40">
                        {t('log.empty')}
                      </td>
                    </tr>
                  ) : (
                    config.rewardLog.map((log) => (
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
        )}
      </div>
    </div>
  );
}
