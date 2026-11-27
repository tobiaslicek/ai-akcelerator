export interface NewsItem {
  title?: string;
  tag?: string;
  date?: string;
  summary?: string;
  why?: string;
  try?: string;
  url?: string;
  source?: string;
}
export interface Brief {
  id: string;
  date: string;
  headline?: string;
  items?: NewsItem[];
}
export interface TopicProgress {
  at: number;
  stage: number;
  due: string;
  last?: string | null;
}
export type Day = { brief?: boolean; review?: boolean; lesson?: boolean };
export type Days = Record<string, Day>;
export interface Turn {
  role: "user" | "assistant";
  content: string;
}
export interface Note {
  id: string;
  title?: string;
  topicId?: string | null;
  turns?: Turn[];
  createdAt?: number;
}
export interface LibItem {
  id: string;
  url?: string;
  title: string;
  author?: string;
  kind?: string;
  theme?: string;
  pick?: number;
  why?: string;
  order?: number;
  done?: boolean;
  own?: boolean;
}
export interface SysItem {
  id: string;
  name: string;
  kind?: string;
  status?: string;
  note?: string;
  minutes?: number;
  createdAt?: number;
}
export interface ChStep {
  text: string;
  done?: boolean;
}
export interface Challenge {
  id: string;
  week?: string;
  title?: string;
  why?: string;
  steps?: ChStep[];
  createdAt?: number;
}
export interface QuizItem {
  q: string;
  options: string[];
  correct: number;
  why: string;
}
export interface Quiz {
  busy: boolean;
  items: QuizItem[];
  answers: Record<number, number>;
  error?: string;
}
export interface Lesson {
  title: string;
  topicId: string | null;
  noteId: string | null;
  savedLen: number;
  turns: Turn[];
  busy: boolean;
  stream: string;
  error: string | null;
  quiz: Quiz | null;
}
export interface ReviewItem {
  id: string;
  self?: boolean;
  q?: string;
  options?: string[];
  correct?: number;
  why?: string;
}
export interface Review {
  busy: boolean;
  items: ReviewItem[];
  answers: Record<number, number | boolean>;
  right: Record<number, boolean>;
}
export type View = "dnes" | "ucit-se" | "trasa" | "knihovna" | "systemy";
