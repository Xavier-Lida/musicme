import * as Tone from "tone";
import {
  INSTRUMENTS,
  type InstrumentDefinition,
  type PlaybackInstrumentId,
} from "@/lib/music/instrument-registry";
import { normalizePitchForTone } from "@/lib/music/pitch";

export type { PlaybackInstrumentId } from "@/lib/music/instrument-registry";
export {
  getInstrumentLabel,
  getInstrumentOptions,
  getNotationKind,
  isPlaybackInstrumentId,
  PLAYBACK_INSTRUMENT_IDS,
} from "@/lib/music/instrument-registry";

export interface PartitionInstrument {
  triggerAttackRelease(
    pitch: string,
    duration: number,
    time?: number,
    velocity?: number,
  ): void;
  triggerAttack(pitch: string, time?: number, velocity?: number): void;
  triggerRelease(pitch: string, time?: number): void;
  releaseAll(): void;
  dispose(): void;
}

const cachedInstruments = new Map<PlaybackInstrumentId, PartitionInstrument>();
const instrumentPromises = new Map<
  PlaybackInstrumentId,
  Promise<PartitionInstrument>
>();

type PitchCapableSynth = {
  triggerAttack: (
    pitch: string,
    time?: number,
    velocity?: number,
  ) => void;
  triggerRelease: (pitch: string, time?: number) => void;
  triggerAttackRelease: (
    pitch: string,
    duration: number,
    time?: number,
    velocity?: number,
  ) => void;
  releaseAll: () => void;
};

function wrapWithPitchNormalization(
  source: PitchCapableSynth,
): Pick<
  PartitionInstrument,
  "triggerAttack" | "triggerRelease" | "triggerAttackRelease" | "releaseAll"
> {
  return {
    triggerAttack(pitch, time, velocity) {
      source.triggerAttack(normalizePitchForTone(pitch), time, velocity);
    },
    triggerRelease(pitch, time) {
      source.triggerRelease(normalizePitchForTone(pitch), time);
    },
    triggerAttackRelease(pitch, duration, time, velocity) {
      source.triggerAttackRelease(
        normalizePitchForTone(pitch),
        duration,
        time,
        velocity,
      );
    },
    releaseAll() {
      source.releaseAll();
    },
  };
}

function createFallback(def: InstrumentDefinition): PartitionInstrument {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: def.fallback,
  }).toDestination();

  const wrapped = wrapWithPitchNormalization(synth);

  return {
    ...wrapped,
    dispose() {
      synth.dispose();
    },
  };
}

async function loadSamplerInstrument(
  def: InstrumentDefinition,
): Promise<PartitionInstrument> {
  const reverb = new Tone.Reverb(def.sampler.reverb);
  await reverb.generate();

  const sampler = new Tone.Sampler({
    urls: def.sampler.urls,
    baseUrl: def.sampler.baseUrl,
    release: def.sampler.release,
  });
  sampler.connect(reverb);
  reverb.toDestination();

  await Tone.loaded();

  const wrapped = wrapWithPitchNormalization(sampler);

  return {
    ...wrapped,
    dispose() {
      sampler.dispose();
      reverb.dispose();
    },
  };
}

function loadInstrument(id: PlaybackInstrumentId): Promise<PartitionInstrument> {
  const cached = cachedInstruments.get(id);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = instrumentPromises.get(id);
  if (pending) {
    return pending;
  }

  const def = INSTRUMENTS[id];
  const promise = loadSamplerInstrument(def)
    .then((instrument) => {
      cachedInstruments.set(id, instrument);
      return instrument;
    })
    .catch(() => {
      const fallback = createFallback(def);
      cachedInstruments.set(id, fallback);
      return fallback;
    });

  instrumentPromises.set(id, promise);
  return promise;
}

export function getPartitionInstrument(
  id: PlaybackInstrumentId,
): Promise<PartitionInstrument> {
  return loadInstrument(id);
}

export function disposePartitionInstrument(id?: PlaybackInstrumentId): void {
  if (id) {
    cachedInstruments.get(id)?.dispose();
    cachedInstruments.delete(id);
    instrumentPromises.delete(id);
    return;
  }

  for (const instrument of cachedInstruments.values()) {
    instrument.dispose();
  }
  cachedInstruments.clear();
  instrumentPromises.clear();
}

/** @deprecated Use getPartitionInstrument("piano") */
export function getPianoInstrument(): Promise<PartitionInstrument> {
  return getPartitionInstrument("piano");
}

/** @deprecated Use disposePartitionInstrument */
export function disposePianoInstrument(): void {
  disposePartitionInstrument("piano");
}
