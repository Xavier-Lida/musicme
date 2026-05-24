import { LINE_SPACING } from '@/lib/music/staff-geometry';

/** Standard tuning: low E → high E */
export const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64] as const;
export const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'] as const;
export const MAX_FRET = 15;

export const GUITAR_MIDI_MIN = 40;
export const GUITAR_MIDI_MAX = 88;

export type TabPosition = {
  stringIndex: number;
  fret: number;
};

export function tabStringY(stringIndex: number, tabTop: number): number {
  return tabTop + stringIndex * LINE_SPACING;
}

export function midiToTab(midi: number): TabPosition {
  let best: TabPosition = { stringIndex: 0, fret: 0 };
  let bestFret = Infinity;

  for (let s = 0; s < OPEN_STRING_MIDI.length; s++) {
    const fret = midi - OPEN_STRING_MIDI[s];
    if (fret >= 0 && fret <= MAX_FRET && fret < bestFret) {
      bestFret = fret;
      best = { stringIndex: s, fret };
    }
  }

  if (bestFret === Infinity) {
    const clamped = Math.max(GUITAR_MIDI_MIN, Math.min(GUITAR_MIDI_MAX, midi));
    for (let s = OPEN_STRING_MIDI.length - 1; s >= 0; s--) {
      const fret = clamped - OPEN_STRING_MIDI[s];
      if (fret >= 0 && fret <= MAX_FRET) {
        return { stringIndex: s, fret };
      }
    }
    return { stringIndex: 0, fret: 0 };
  }

  return best;
}

export function yToGuitarMidi(y: number, tabTop: number): number {
  const stringIndex = Math.round((y - tabTop) / LINE_SPACING);
  const clampedString = Math.max(0, Math.min(5, stringIndex));
  const stringY = tabStringY(clampedString, tabTop);
  const halfStepsFromString = Math.round((stringY - y) / (LINE_SPACING / 2));
  const baseMidi = OPEN_STRING_MIDI[clampedString];
  const midi = baseMidi + halfStepsFromString;
  return Math.max(GUITAR_MIDI_MIN, Math.min(GUITAR_MIDI_MAX, midi));
}

export function tabLineYs(tabTop: number): number[] {
  return Array.from({ length: 6 }, (_, i) => tabTop + i * LINE_SPACING);
}
