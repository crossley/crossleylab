import lessonsData from './lessons.json';

export type LessonUnit = 'diffusion' | 'membrane_potential_emergent' | 'action_potential';
export type LessonStatus = 'active' | 'draft' | 'archived';

export interface LessonMeta {
  id: string;
  title: string;
  description: string;
  htmlPath: string;
  tsEntry: string;
  unit: LessonUnit;
  order: number;
  status: LessonStatus;
}

export const lessons: LessonMeta[] = [...(lessonsData as LessonMeta[])].sort((a, b) => a.order - b.order);
