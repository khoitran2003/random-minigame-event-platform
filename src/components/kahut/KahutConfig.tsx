import React, { useRef, useState } from 'react';
import { FileUp, Download, FolderOpen, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { EventConfig, KahutQuestion } from '../../types';
import { useLanguage } from '../../LanguageContext';
import BackgroundSettings from '../BackgroundSettings';
import { buildTemplateCsv, CsvIssue, MAX_QUESTIONS, parseQuestionCsv } from './parseQuestionCsv';
import { ImageMatch, matchImages } from './matchImages';

interface Props {
  config: EventConfig;
  onUpdate: (config: Partial<EventConfig>) => void;
  questions: KahutQuestion[];
  onQuestionsChange: (questions: KahutQuestion[]) => void;
  imageMatch: ImageMatch | null;
  onImagesChange: (match: ImageMatch | null) => void;
  onPreview: () => void;
}

const MAX_ERRORS_SHOWN = 8;

export default function KahutConfig({
  config, onUpdate, questions, onQuestionsChange, imageMatch, onImagesChange, onPreview,
}: Props) {
  const { t } = useLanguage();
  const csvInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<CsvIssue[]>([]);
  const [fileName, setFileName] = useState('');

  const handleCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    const result = await parseQuestionCsv(file);
    setErrors(result.errors);
    onQuestionsChange(result.questions);
  };

  const handleFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files ?? []) as File[];
    e.target.value = '';
    if (files.length === 0) return;
    onImagesChange(matchImages(files));
  };

  const downloadTemplate = () => {
    const blob = new Blob(['﻿' + buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'questions.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const questionIds = new Set(questions.map(q => q.id));
  const unknownImageIds = imageMatch ? imageMatch.matchedIds.filter(id => !questionIds.has(id)) : [];
  const matchedCount = imageMatch ? imageMatch.matchedIds.filter(id => questionIds.has(id)).length : 0;

  const panel = 'rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-5 flex flex-col gap-4';
  const btn = 'flex items-center gap-2 text-white/90 text-[14px] font-medium px-4 py-3 rounded-lg border border-white/25 hover:border-neon-cyan hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all';
  const heading = 'font-mono text-sm tracking-wider text-neon-cyan';

  return (
    <div className="max-w-[900px] mx-auto p-6 md:p-10 text-white flex flex-col gap-6 font-display">
      <h1 className="text-3xl md:text-4xl font-bold tracking-wide">GS Multiple-choice <span className="font-mono text-neon-magenta text-base font-normal tracking-[0.3em]">· {t('kahut.configTitle')}</span></h1>

      {/* Step 1: CSV */}
      <section className={panel}>
        <h2 className={heading}>01 / {t('kahut.stepCsv')}</h2>
        <p className="text-sm text-white/70">{t('kahut.csvHelp', { max: MAX_QUESTIONS })}</p>
        <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleCsv} className="hidden" />
        <div className="flex flex-wrap gap-3">
          <button onClick={() => csvInputRef.current?.click()} className={btn}>
            <FileUp className="w-4 h-4" /> {t('kahut.uploadCsv')}
          </button>
          <button onClick={downloadTemplate} className={btn}>
            <Download className="w-4 h-4" /> {t('kahut.downloadTemplate')}
          </button>
        </div>

        {errors.length > 0 && (
          <div className="bg-neon-magenta/10 border border-neon-magenta/50 rounded-lg p-4 text-sm flex flex-col gap-1">
            <div className="flex items-center gap-2 font-bold text-neon-magenta">
              <AlertTriangle className="w-4 h-4" /> {t('kahut.csvInvalid', { file: fileName })}
            </div>
            {errors.slice(0, MAX_ERRORS_SHOWN).map((err, i) => (
              <div key={i} className="text-white/90">• {t(`kahut.err.${err.code}`, err.params)}</div>
            ))}
            {errors.length > MAX_ERRORS_SHOWN && (
              <div className="text-white/60">{t('kahut.moreErrors', { count: errors.length - MAX_ERRORS_SHOWN })}</div>
            )}
          </div>
        )}
        {questions.length > 0 && (
          <div className="flex items-center gap-2 text-neon-lime font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" /> {t('kahut.csvLoaded', { count: questions.length, file: fileName })}
          </div>
        )}
      </section>

      {/* Step 2: images (optional) */}
      <section className={panel}>
        <h2 className={heading}>02 / {t('kahut.stepImages')} <span className="text-white/50 text-xs">({t('kahut.optional')})</span></h2>
        <p className="text-sm text-white/70">{t('kahut.imagesHelp')}</p>
        <input
          ref={folderInputRef}
          type="file"
          multiple
          webkitdirectory=""
          onChange={handleFolder}
          className="hidden"
        />
        <div className="flex flex-wrap gap-3">
          <button onClick={() => folderInputRef.current?.click()} className={btn}>
            <FolderOpen className="w-4 h-4" /> {t('kahut.uploadFolder')}
          </button>
          {imageMatch && (
            <button onClick={() => onImagesChange(null)} className={btn}>{t('kahut.clearImages')}</button>
          )}
        </div>
        {imageMatch && (
          <div className="text-sm flex flex-col gap-1">
            <div className="text-neon-lime font-bold">
              {t('kahut.imagesMatched', { matched: matchedCount, total: questions.length })}
            </div>
            {questions.length > 0 && matchedCount < questions.length && (
              <div className="text-white/70">
                {t('kahut.imagesMissing', { ids: questions.filter(q => !imageMatch.urls[q.id]).map(q => q.id).join(', ') })}
              </div>
            )}
            {(unknownImageIds.length > 0 || imageMatch.skipped.length > 0) && (
              <div className="text-neon-orange">
                {t('kahut.imagesIgnored', { names: [...unknownImageIds.map(String), ...imageMatch.skipped].join(', ') })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Background */}
      <section className={panel}>
        <h2 className={heading}>03 / {t('config.backgroundStyling')}</h2>
        <BackgroundSettings config={config} onUpdate={onUpdate} />
      </section>

      <button
        onClick={onPreview}
        disabled={questions.length === 0}
        className="self-end flex items-center gap-2 border-2 border-neon-cyan text-neon-cyan font-bold text-lg px-8 py-3.5 rounded-lg hover:bg-neon-cyan/15 hover:shadow-[0_0_24px_rgba(34,211,238,0.4)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none"
      >
        <Eye className="w-5 h-5" /> {t('kahut.preview')}
      </button>
    </div>
  );
}
