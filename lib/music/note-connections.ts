import type { PartitionNote } from "@/lib/types/partition";

const ADJACENCY_EPSILON = 1e-6;

/** Overlap in beats added to slurred notes for legato playback. */
export const LEGATO_OVERLAP_BEATS = 0.08;

export interface TieGroup {
  startIndex: number;
  endIndex: number;
}

export interface SlurPair {
  fromIndex: number;
  toIndex: number;
}

export type PlaybackEventKind = "single" | "tied" | "slurred";

export interface PlaybackEvent {
  pitch: string;
  start: number;
  duration: number;
  kind: PlaybackEventKind;
  sourceIndices: number[];
}

export function areAdjacentNotes(a: PartitionNote, b: PartitionNote): boolean {
  return Math.abs(a.start + a.duration - b.start) < ADJACENCY_EPSILON;
}

export function findTieGroups(notes: PartitionNote[]): TieGroup[] {
  const groups: TieGroup[] = [];
  let i = 0;

  while (i < notes.length) {
    let end = i;
    while (
      end + 1 < notes.length &&
      areAdjacentNotes(notes[end], notes[end + 1]) &&
      notes[end].pitch === notes[end + 1].pitch
    ) {
      end++;
    }

    if (end > i) {
      groups.push({ startIndex: i, endIndex: end });
    }
    i = end + 1;
  }

  return groups;
}

function isIndexInTieGroup(
  index: number,
  tieGroups: TieGroup[],
): TieGroup | undefined {
  return tieGroups.find(
    (group) => index >= group.startIndex && index <= group.endIndex,
  );
}

function areInSameTieGroup(
  a: number,
  b: number,
  tieGroups: TieGroup[],
): boolean {
  return tieGroups.some(
    (group) =>
      a >= group.startIndex &&
      a <= group.endIndex &&
      b >= group.startIndex &&
      b <= group.endIndex,
  );
}

export function findSlurPairs(notes: PartitionNote[]): SlurPair[] {
  const tieGroups = findTieGroups(notes);
  const pairs: SlurPair[] = [];

  for (let i = 0; i < notes.length - 1; i++) {
    if (!areAdjacentNotes(notes[i], notes[i + 1])) continue;
    if (notes[i].pitch === notes[i + 1].pitch) continue;
    if (areInSameTieGroup(i, i + 1, tieGroups)) continue;
    pairs.push({ fromIndex: i, toIndex: i + 1 });
  }

  return pairs;
}

function isSlurFromIndex(index: number, slurPairs: SlurPair[]): boolean {
  return slurPairs.some((pair) => pair.fromIndex === index);
}

export function buildPlaybackEvents(notes: PartitionNote[]): PlaybackEvent[] {
  if (notes.length === 0) return [];

  const tieGroups = findTieGroups(notes);
  const slurPairs = findSlurPairs(notes);
  const events: PlaybackEvent[] = [];

  for (let i = 0; i < notes.length; i++) {
    const tieGroup = isIndexInTieGroup(i, tieGroups);
    if (tieGroup && i !== tieGroup.startIndex) continue;

    if (tieGroup) {
      const groupNotes = notes.slice(tieGroup.startIndex, tieGroup.endIndex + 1);
      const totalDuration = groupNotes.reduce((sum, n) => sum + n.duration, 0);
      events.push({
        pitch: notes[tieGroup.startIndex].pitch,
        start: notes[tieGroup.startIndex].start,
        duration: totalDuration,
        kind: "tied",
        sourceIndices: Array.from(
          { length: tieGroup.endIndex - tieGroup.startIndex + 1 },
          (_, j) => tieGroup.startIndex + j,
        ),
      });
      continue;
    }

    const note = notes[i];
    let duration = note.duration;
    let kind: PlaybackEventKind = "single";

    if (isSlurFromIndex(i, slurPairs)) {
      duration += LEGATO_OVERLAP_BEATS;
      kind = "slurred";
    }

    events.push({
      pitch: note.pitch,
      start: note.start,
      duration,
      kind,
      sourceIndices: [i],
    });
  }

  return events;
}
