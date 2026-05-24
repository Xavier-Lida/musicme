'use client';

import { useState } from 'react';

export interface ProjectMetadata {
  name: string;
  author: string;
  instruments: string[]; // multi-select — was instrument: string
}

const DEFAULT_METADATA: ProjectMetadata = {
  name: '',
  author: '',
  instruments: [],
};

export function useProjectMetadata(initial: Partial<ProjectMetadata> = {}) {
  const [metadata, setMetadata] = useState<ProjectMetadata>({
    ...DEFAULT_METADATA,
    ...initial,
  });

  function updateField<K extends keyof ProjectMetadata>(key: K, value: ProjectMetadata[K]) {
    setMetadata((prev) => ({ ...prev, [key]: value }));
  }

  return { metadata, updateField, setMetadata };
}
