import lessonsData from './lessons.json';

export type LessonArc =
  | 'diffusion'
  | 'concentration_gradients'
  | 'resting_potential'
  | 'voltage_and_current'
  | 'action_potential';

export type LessonStatus = 'active' | 'draft' | 'rebuild' | 'future' | 'archived';

export interface LessonMeta {
  id: string;
  title: string;
  description: string;
  htmlPath: string;
  tsEntry: string;
  arc: LessonArc;
  status: LessonStatus;
}

// Array order in lessons.json determines lesson order within each arc.
export const lessons: LessonMeta[] = lessonsData as LessonMeta[];
