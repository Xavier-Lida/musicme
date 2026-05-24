'use client';

import { useState } from 'react';

export interface ProjectMetadata {
  name: string;
  author: string;
  instrument: string;
}

const DEFAULT_METADATA: ProjectMetadata = {
  name: '',
  author: '',
  instrument: '',
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
