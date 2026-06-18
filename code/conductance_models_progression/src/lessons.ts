import lessonsData from './lessons.json';

export type LessonArc = 'conductance_models';

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

export const lessons: LessonMeta[] = lessonsData as LessonMeta[];
