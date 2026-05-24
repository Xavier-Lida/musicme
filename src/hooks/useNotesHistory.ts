import { useCallback, useReducer } from 'react';
import type { Note } from '@/types/transcription';

const MAX_HISTORY = 50;

type HistoryState = {
  past: Note[][];
  present: Note[];
  future: Note[][];
};

type HistoryAction =
  | { type: 'SET'; notes: Note[]; recordHistory: boolean }
  | { type: 'RESET'; notes: Note[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'SET': {
      if (!action.recordHistory) {
        return { ...state, present: action.notes, future: [] };
      }
      if (JSON.stringify(state.present) === JSON.stringify(action.notes)) {
        return state;
      }
      const past = [...state.past, state.present].slice(-MAX_HISTORY);
      return { past, present: action.notes, future: [] };
    }
    case 'RESET':
      return { past: [], present: action.notes, future: [] };
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

export type SetNotesOptions = {
  recordHistory?: boolean;
};

export function useNotesHistory(initialNotes: Note[] = []) {
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialNotes,
    future: [],
  });

  const setNotes = useCallback((notes: Note[], options: SetNotesOptions = {}) => {
    dispatch({
      type: 'SET',
      notes,
      recordHistory: options.recordHistory ?? true,
    });
  }, []);

  const resetHistory = useCallback((notes: Note[]) => {
    dispatch({ type: 'RESET', notes });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  return {
    notes: state.present,
    setNotes,
    resetHistory,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
