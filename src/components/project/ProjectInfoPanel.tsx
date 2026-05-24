'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProjectMetadata } from '@/hooks/useProjectMetadata';
import { cn } from '@/lib/utils';

interface ProjectInfoPanelProps {
  metadata: ProjectMetadata;
  onFieldChange: <K extends keyof ProjectMetadata>(
    key: K,
    value: ProjectMetadata[K],
  ) => void;
  className?: string;
}

const INSTRUMENT_OPTIONS = ['Piano', 'Guitare', 'Autre'];

export function ProjectInfoPanel({
  metadata,
  onFieldChange,
  className,
}: ProjectInfoPanelProps) {
  return (
    <Card className={cn('w-full shrink-0 lg:w-64 lg:sticky lg:top-16 lg:self-start', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Informations</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="project-name">Nom</FieldLabel>
            <Input
              id="project-name"
              placeholder="Sans titre"
              value={metadata.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="project-author">Auteur</FieldLabel>
            <Input
              id="project-author"
              placeholder="Nom de l'auteur"
              value={metadata.author}
              onChange={(e) => onFieldChange('author', e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="project-instrument">Instrument</FieldLabel>
            <Select
              value={
                INSTRUMENT_OPTIONS.includes(metadata.instrument)
                  ? metadata.instrument
                  : undefined
              }
              onValueChange={(value) => onFieldChange('instrument', value)}
            >
              <SelectTrigger id="project-instrument" className="w-full">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {INSTRUMENT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
