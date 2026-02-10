
export type Theme = 'dark' | 'white';

export interface CircleState {
  marked: boolean;
}

export interface TaskState {
  text: string;
  notes: string;
}

export interface DayData {
  circles: { [key: string]: CircleState }; // Keys will be F, Z, A, M, E, T1, T2
  tasks: { [key: string]: TaskState }; // QURAN, HADITH, etc.
}

export interface AppState {
  theme: Theme;
  title: string;
  userName: string;
  userImage: string;
  data: { [day: number]: DayData };
}

// Internal unique identifiers for state management
export const CIRCLE_COLUMNS = ['F', 'Z', 'A', 'M', 'E', 'T1', 'T2'];

// Mapping for display labels to maintain original UI look
export const CIRCLE_LABELS: Record<string, string> = {
  'F': 'F',
  'Z': 'Z',
  'A': 'A',
  'M': 'M',
  'E': 'E',
  'T1': 'T',
  'T2': 'T'
};

export const TASK_COLUMNS = [
  'QURAN TILWAT',
  'HADITH',
  'SADKA',
  'DUROOD',
  'ISTIGFAAR',
  'DUA'
];

export const STORAGE_KEY = 'PRODUCTIVE_TRACKER_OFFLINE_STORAGE';
