import { describe, it, expect } from 'vitest';
import { parseNames } from '../src/names';

describe('parseNames', () => {
  it('splits by commas and newlines', () => {
    expect(parseNames('иванов петя, Сидорова Маша\nПетров Коля')).toEqual(['Иванов Петя', 'Сидорова Маша', 'Петров Коля']);
  });
  it('splits by sentence dots that iOS dictation inserts', () => {
    expect(parseNames('Иванов Петя. Сидорова Маша.')).toEqual(['Иванов Петя', 'Сидорова Маша']);
  });
  it('drops empties, trims, collapses spaces, dedupes', () => {
    expect(parseNames(' ,  Иванов   Петя ,, иванов петя ')).toEqual(['Иванов Петя']);
  });
  it('keeps text without separators as one entry for manual fixing', () => {
    expect(parseNames('Иванов Петя Сидорова Маша')).toEqual(['Иванов Петя Сидорова Маша']);
  });
  it('keeps hyphenated names capitalised', () => {
    expect(parseNames('мамина-сибиряк анна')).toEqual(['Мамина-Сибиряк Анна']);
  });
});
