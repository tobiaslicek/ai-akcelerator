import type { Turn } from "../types";

export interface DocSnap {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
  metadata: { fromCache: boolean };
}
export interface QuerySnap {
  docs: DocSnap[];
  metadata: { fromCache: boolean };
}
export interface DocRef {
  get(): Promise<DocSnap>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(next: (s: DocSnap) => void, error?: (e: unknown) => void): () => void;
}
export interface Query {
  orderBy(field: string, dir?: "asc" | "desc"): Query;
  limit(n: number): Query;
  onSnapshot(next: (s: QuerySnap) => void, error?: (e: unknown) => void): () => void;
}
export interface Collection extends Query {
  doc(id?: string): DocRef;
  add(data: Record<string, unknown>): Promise<unknown>;
}
export interface Db {
  doc(path: string): DocRef;
  collection(path: string): Collection;
}
export interface SampleOptions {
  cache?: boolean;
  signal?: AbortSignal;
  onText?: (u: { text: string }) => void;
}
export interface Sample {
  (input: string | Turn[], options?: SampleOptions): Promise<{ text: string; truncated: boolean }>;
  json(input: string, options?: SampleOptions): Promise<unknown>;
}
export interface SampleError {
  code?: string;
  text?: string;
  reason?: string;
}
export interface Tts {
  speak(lines: { text: string }[], options?: { language?: string }): Promise<void>;
  stop(): Promise<void>;
  onState(fn: (e: { state: string }) => void): void;
}
export interface Dictation {
  active(): boolean;
  start(options?: { language?: string }): Promise<void>;
  stop(): Promise<void>;
  onFinal(fn: (e: { text: string }) => void): void;
  onState(fn: (e: { state: string }) => void): void;
}
export interface Desktop {
  install?: { state(): Promise<string>; request(): Promise<void> };
  app?: { dock?: { setIcon(dataUrl: string): Promise<void> } };
}
export interface UserCap {
  isOwner(): Promise<boolean | null>;
}

declare global {
  interface Window {
    claude?: { use(name: string): Promise<unknown> };
  }
}

const use = <T,>(name: string): Promise<T | null> => {
  const c = window.claude;
  if (!c || typeof c.use !== "function") return Promise.resolve(null);
  return (c.use(name) as Promise<T | null>).catch(() => null);
};

export const dbP = use<Db>("db");
export const sampleP = use<Sample>("sample");
export const userP = use<UserCap>("user");
export const ttsP = use<Tts>("tts");
export const dictP = use<Dictation>("dictation");
export const deskP = use<Desktop>("desktop");
