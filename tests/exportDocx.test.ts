import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import JSZip from 'jszip';
import { buildDocxDocument } from '../src/exportDocx';

describe('exportDocx', () => {
  it('contains title, names and values with comma', async () => {
    const doc = buildDocxDocument({ groupName: '4,5–5,5 лет', date: '2026-10-30',
      exercises: [{ id: 'e', group_id: 'g', name: 'Прыжок', unit: 'м', sort: 1, updated_at: '' }],
      athletes: [{ id: 'a', group_id: 'g', full_name: 'Иванов Петя', updated_at: '' }],
      value: () => 1.2 });
    const zip = await JSZip.loadAsync(await Packer.toBuffer(doc));
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('Иванов Петя'); expect(xml).toContain('1,2'); expect(xml).toContain('30.10.2026'); expect(xml).toContain('Прыжок');
  });
});
