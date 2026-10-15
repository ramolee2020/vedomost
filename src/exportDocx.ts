import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, PageOrientation, VerticalAlign, HeightRule, TabStopType } from 'docx';
import type { Athlete, Exercise } from './types';
import { formatValue } from './values';

type Opts = { groupName: string; date: string; exercises: Exercise[]; athletes: Athlete[]; value: (a: string, e: string) => number | null };
const TOTAL = 15704, NUM = 500, NAME = 3000, ITOG = 1300, FONT = 'Arial';
const b = { style: 'single' as const, size: 6, color: '000000' };
const borders = { top: b, bottom: b, left: b, right: b };
const p = (text: string, o: { bold?: boolean; size?: number; left?: boolean } = {}) =>
  new Paragraph({ alignment: o.left ? AlignmentType.LEFT : AlignmentType.CENTER, children: [new TextRun({ text, font: FONT, size: o.size ?? 18, bold: o.bold })] });
const cell = (children: Paragraph[], w: number, shade = false) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER,
  margins: { top: 40, bottom: 40, left: 60, right: 60 }, shading: shade ? { type: ShadingType.CLEAR, color: 'auto', fill: 'EEEEEE' } : undefined, children });

export function buildDocxDocument(o: Opts) {
  const n = Math.max(1, o.exercises.length);
  const nw = Math.floor((TOTAL - NUM - NAME - ITOG) / n);
  const itog = TOTAL - NUM - NAME - nw * n;
  const widths = [NUM, NAME, ...o.exercises.map(() => nw), itog];
  const header = new TableRow({ tableHeader: true, children: [cell([p('№', { bold: true })], NUM, true), cell([p('Фамилия Имя', { bold: true })], NAME, true),
    ...o.exercises.map(e => cell([p(e.name, { bold: true }), p(e.unit, { size: 16 })], nw, true)), cell([p('Итог', { bold: true })], itog, true)] });
  const rowsCount = Math.max(o.athletes.length, 16);
  const rows = Array.from({ length: rowsCount }, (_, i) => {
    const a = o.athletes[i];
    return new TableRow({ height: { value: 420, rule: HeightRule.ATLEAST }, children: [
      cell([p(String(i + 1))], NUM), cell([p(a?.full_name ?? '', { left: true })], NAME),
      ...o.exercises.map(e => cell([p(a ? formatValue(o.value(a.id, e.id)) : '')], nw)), cell([p('')], itog)] });
  });
  const date = o.date.split('-').reverse().join('.');
  return new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 567, bottom: 567, left: 567, right: 567 } } },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: `Ведомость сдачи нормативов ОФП — группа ${o.groupName}`, font: FONT, size: 32, bold: true })] }),
      new Paragraph({ spacing: { after: 160 }, tabStops: [{ type: TabStopType.RIGHT, position: TOTAL }], children: [new TextRun({ text: `Дата: ${date}\tТренер: ______________________________`, font: FONT, size: 22 })] }),
      new Table({ width: { size: TOTAL, type: WidthType.DXA }, columnWidths: widths, rows: [header, ...rows] }),
    ] }] });
}

export const buildDocx = (o: Opts) => Packer.toBlob(buildDocxDocument(o));
