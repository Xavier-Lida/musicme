import * as Tone from "tone";
import { buildPlaybackEvents } from "@/lib/music/note-connections";
import type { PartitionInstrument } from "@/lib/music/piano-instrument";
import {
  getPartitionDurationBeats,
  type PartitionResponse,
} from "@/lib/types/partition";

export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats / bpm) * 60;
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return hash;
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

export function humanizeNoteTiming(
  startSec: number,
  durationSec: number,
  seed: string,
): { startSec: number; durationSec: number } {
  const hash = hashSeed(seed);
  const startJitter = (pseudoRandom(hash) - 0.5) * 0.05;
  const durationScale = 1 + (pseudoRandom(hash + 1) - 0.5) * 0.08;

  return {
    startSec: Math.max(0, startSec + startJitter),
    durationSec: durationSec * durationScale,
  };
}

export function estimateNoteVelocity(durationBeats: number): number {
  const normalized = Math.min(durationBeats / 2, 1);
  return 0.45 + normalized * 0.3;
}

export function schedulePartitionOnTransport(
  partition: PartitionResponse,
  instrument: PartitionInstrument,
): number[] {
  const eventIds: number[] = [];
  const { bpm } = partition;

  Tone.Transport.bpm.value = bpm;

  const playbackEvents = buildPlaybackEvents(partition.notes);

  playbackEvents.forEach((event) => {
    const startSeconds = beatsToSeconds(event.start, bpm);
    const durationSeconds = beatsToSeconds(event.duration, bpm);
    const seed = event.sourceIndices
      .map((index) => `${partition.id}-${index}`)
      .join(",");
    const { startSec, durationSec } = humanizeNoteTiming(
      startSeconds,
      durationSeconds,
      seed,
    );
    const velocity = estimateNoteVelocity(event.duration);

    const id = Tone.Transport.schedule((time) => {
      instrument.triggerAttackRelease(
        event.pitch,
        durationSec,
        time,
        velocity,
      );
    }, startSec);

    eventIds.push(id);
  });

  return eventIds;
}

export function clearScheduledEvents(eventIds: number[]): void {
  for (const id of eventIds) {
    Tone.Transport.clear(id);
  }
}

export function getPlaybackDurationSeconds(
  partition: PartitionResponse,
): number {
  return beatsToSeconds(getPartitionDurationBeats(partition), partition.bpm);
}
