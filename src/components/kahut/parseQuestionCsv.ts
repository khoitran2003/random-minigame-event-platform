import Papa from 'papaparse';
import { KahutQuestion } from '../../types';

export const MAX_QUESTIONS = 50;
export const DEFAULT_TIME_SEC = 20;
const MIN_TIME_SEC = 5;
const MAX_TIME_SEC = 120;

export interface CsvIssue {
  code: string;
  params?: Record<string, string | number>;
}

export interface ParseResult {
  questions: KahutQuestion[];
  errors: CsvIssue[];
}

const ANSWER_COLUMNS = ['a', 'b', 'c', 'd'];

function parseCorrect(raw: string): number {
  const v = raw.trim().toLowerCase();
  const letter = ANSWER_COLUMNS.indexOf(v);
  if (letter >= 0) return letter;
  const num = Number(v);
  return Number.isInteger(num) && num >= 1 && num <= 4 ? num - 1 : -1;
}

export function parseQuestionRows(rows: Record<string, string>[]): ParseResult {
  const errors: CsvIssue[] = [];
  const questions: KahutQuestion[] = [];

  if (rows.length === 0) return { questions, errors: [{ code: 'noRows' }] };
  if (rows.length > MAX_QUESTIONS) {
    return { questions, errors: [{ code: 'tooMany', params: { max: MAX_QUESTIONS, count: rows.length } }] };
  }

  const columns = Object.keys(rows[0]);
  for (const col of ['id', 'question', 'a', 'b', 'correct']) {
    if (!columns.includes(col)) errors.push({ code: 'missingColumn', params: { col } });
  }
  if (errors.length > 0) return { questions, errors };

  rows.forEach((row, i) => {
    const line = i + 2; // header is line 1
    const expectedId = i + 1;
    const get = (k: string) => String(row[k] ?? '').trim();

    if (get('id') !== String(expectedId)) {
      errors.push({ code: 'badId', params: { line, expected: expectedId, got: get('id') || '(trống)' } });
      return;
    }

    const text = get('question');
    if (!text) {
      errors.push({ code: 'missingQuestion', params: { line } });
      return;
    }

    const raw = ANSWER_COLUMNS.map(get);
    if (!raw[0] || !raw[1]) {
      errors.push({ code: 'needTwoAnswers', params: { line } });
      return;
    }
    const answers = raw.filter(Boolean);
    if (raw.slice(0, answers.length).some(a => !a)) {
      errors.push({ code: 'answerGap', params: { line } });
      return;
    }

    const correctIndex = parseCorrect(get('correct'));
    if (correctIndex < 0 || correctIndex >= answers.length) {
      errors.push({ code: 'badCorrect', params: { line, value: get('correct') || '(trống)' } });
      return;
    }

    const t = Number(get('time'));
    const timeSec = Number.isFinite(t) && t > 0
      ? Math.min(MAX_TIME_SEC, Math.max(MIN_TIME_SEC, Math.round(t)))
      : DEFAULT_TIME_SEC;

    questions.push({ id: expectedId, question: text, answers, correctIndex, timeSec });
  });

  return { questions: errors.length > 0 ? [] : questions, errors };
}

export function parseQuestionCsv(file: File): Promise<ParseResult> {
  return new Promise(resolve => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.replace(/^﻿/, '').trim().toLowerCase(),
      complete: results => {
        if (results.errors.some(e => e.type !== 'FieldMismatch')) {
          resolve({ questions: [], errors: [{ code: 'parse' }] });
          return;
        }
        resolve(parseQuestionRows(results.data));
      },
      error: () => resolve({ questions: [], errors: [{ code: 'read' }] }),
    });
  });
}

export function buildTemplateCsv(): string {
  return Papa.unparse({
    fields: ['id', 'question', 'a', 'b', 'c', 'd', 'correct', 'time'],
    data: [
      [1, 'Thủ đô của Việt Nam là gì?', 'Hà Nội', 'Đà Nẵng', 'Huế', 'Cần Thơ', 'A', 20],
      [2, '2 + 2 = 4, đúng hay sai?', 'Đúng', 'Sai', '', '', 'A', 10],
      [3, 'Con vật nào kêu "meo"?', 'Chó', 'Mèo', 'Gà', '', 'B', 15],
    ],
  });
}
