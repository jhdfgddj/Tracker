
import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Camera, Trash2, Moon, Sun, Download, Check, X, User, Save } from 'lucide-react';
import { 
  AppState, 
  STORAGE_KEY, 
  CIRCLE_COLUMNS, 
  CIRCLE_LABELS,
  TASK_COLUMNS, 
  DayData, 
  CircleState, 
  TaskState 
} from './types';

const createFreshState = (): AppState => {
  const initialData: { [day: number]: DayData } = {};
  for (let i = 1; i <= 30; i++) {
    const circles: { [key: string]: CircleState } = {};
    CIRCLE_COLUMNS.forEach(col => circles[col] = { marked: false });
    
    const tasks: { [key: string]: TaskState } = {};
    TASK_COLUMNS.forEach(col => tasks[col] = { text: '', notes: '' });
    
    initialData[i] = { circles, tasks };
  }

  return {
    theme: 'dark',
    title: 'Tracker',
    userName: 'User Name',
    userImage: '',
    data: initialData,
  };
};

const getInitialState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Migration for old data structure
      Object.values(parsed.data).forEach((day: any) => {
        if (day.circles['T'] !== undefined) {
           day.circles['T1'] = { marked: day.circles['T'].marked };
           day.circles['T2'] = { marked: false };
           delete day.circles['T'];
        }
      });
      return parsed;
    } catch (e) {
      console.error("Failed to parse storage", e);
    }
  }
  return createFreshState();
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(getInitialState());
  const [isRenaming, setIsRenaming] = useState(false);
  const [localTitleDraft, setLocalTitleDraft] = useState("");
  const [activeNotes, setActiveNotes] = useState<{ day: number, task: string } | null>(null);
  const [circleContext, setCircleContext] = useState<{ day: number, col: string, x: number, y: number } | null>(null);
  const [editingTask, setEditingTask] = useState<{ day: number, task: string } | null>(null);
  const [localTaskText, setLocalTaskText] = useState("");
  const [resetProgress, setResetProgress] = useState(0);
  const [titleRenameProgress, setTitleRenameProgress] = useState(0);
  
  const resetTimerRef = useRef<number | null>(null);
  const titleRenameTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<{ [key: string]: number }>({});
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const calculateProgress = () => {
    let totalItems = 30 * (CIRCLE_COLUMNS.length + TASK_COLUMNS.length);
    let completedItems = 0;

    Object.values(state.data).forEach((day: DayData) => {
      Object.values(day.circles).forEach((c: CircleState) => { if (c.marked) completedItems++; });
      Object.values(day.tasks).forEach((t: TaskState) => { if (t.text.trim().length > 0) completedItems++; });
    });

    return totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
  };

  const toggleTheme = () => {
    setState(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'white' : 'dark' }));
  };

  const handleCircleLongPress = (day: number, col: string, rect: DOMRect) => {
    setCircleContext({ day, col, x: rect.left, y: rect.top });
  };

  const markCircle = (day: number, col: string, marked: boolean) => {
    setState(prev => {
      const newData = { ...prev.data };
      newData[day] = {
        ...newData[day],
        circles: {
          ...newData[day].circles,
          [col]: { marked }
        }
      };
      return { ...prev, data: newData };
    });
    setCircleContext(null);
  };

  const saveTaskText = () => {
    if (!editingTask) return;
    const { day, task } = editingTask;
    setState(prev => {
      const newData = { ...prev.data };
      newData[day] = {
        ...newData[day],
        tasks: {
          ...newData[day].tasks,
          [task]: { ...newData[day].tasks[task], text: localTaskText }
        }
      };
      return { ...prev, data: newData };
    });
    setEditingTask(null);
  };

  const saveTitle = () => {
    setState(prev => ({ ...prev, title: localTitleDraft || 'Tracker' }));
    setIsRenaming(false);
  };

  const updateTaskNotes = (day: number, task: string, notes: string) => {
    setState(prev => {
      const newData = { ...prev.data };
      newData[day] = {
        ...newData[day],
        tasks: {
          ...newData[day].tasks,
          [task]: { ...newData[day].tasks[task], notes }
        }
      };
      return { ...prev, data: newData };
    });
  };

  const handleProfileImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({ ...prev, userImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const startResetTimer = () => {
    const start = Date.now();
    resetTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min((elapsed / 4000) * 100, 100);
      setResetProgress(progress);
      if (elapsed >= 4000) {
        if (resetTimerRef.current) clearInterval(resetTimerRef.current);
        const fresh = createFreshState();
        setState(fresh);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        setResetProgress(0);
      }
    }, 50);
  };

  const clearResetTimer = () => {
    if (resetTimerRef.current) {
      clearInterval(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setResetProgress(0);
  };

  const startTitleRenameTimer = () => {
    const start = Date.now();
    titleRenameTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min((elapsed / 4000) * 100, 100);
      setTitleRenameProgress(progress);
      if (elapsed >= 4000) {
        if (titleRenameTimerRef.current) clearInterval(titleRenameTimerRef.current);
        setTitleRenameProgress(0);
        startTitleRename();
      }
    }, 50);
  };

  const clearTitleRenameTimer = () => {
    if (titleRenameTimerRef.current) {
      clearInterval(titleRenameTimerRef.current);
      titleRenameTimerRef.current = null;
    }
    setTitleRenameProgress(0);
  };

  const handleLongPress = (id: string, ms: number, callback: () => void) => {
    longPressTimerRef.current[id] = window.setTimeout(callback, ms);
  };

  const clearLongPress = (id: string) => {
    if (longPressTimerRef.current[id]) {
      clearTimeout(longPressTimerRef.current[id]);
      delete longPressTimerRef.current[id];
    }
  };

  const startTitleRename = () => {
    setLocalTitleDraft(state.title);
    setIsRenaming(true);
  };

  const exportAsImage = async () => {
    if (!captureRef.current) return;
    try {
      const elementsToHide = document.querySelectorAll('.no-export');
      elementsToHide.forEach(el => (el as HTMLElement).style.opacity = '0');

      const canvas = await (window as any).html2canvas(captureRef.current, {
        backgroundColor: state.theme === 'dark' ? '#0f172a' : '#f8fafc',
        scale: 3,
        useCORS: true,
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `tracker_${state.userName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toToDataURL('image/png');
      link.click();

      elementsToHide.forEach(el => (el as HTMLElement).style.opacity = '1');
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const isDark = state.theme === 'dark';
  const bgColor = isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const cellBg = isDark ? 'bg-slate-800/40' : 'bg-white';

  return (
    <div className={`fixed inset-0 flex flex-col font-sans overflow-hidden select-none ${bgColor} transition-colors duration-300`}>
      <div ref={captureRef} className="flex-1 flex flex-col p-2 space-y-1 overflow-hidden h-full">
        
        {/* Header with Customizable Title */}
        <header className="flex items-center justify-between px-2 py-1">
          <div className="relative flex items-center">
            <h1 
              className="text-lg font-bold tracking-tight cursor-pointer relative z-10 px-1"
              onTouchStart={startTitleRenameTimer}
              onTouchEnd={clearTitleRenameTimer}
              onMouseDown={startTitleRenameTimer}
              onMouseUp={clearTitleRenameTimer}
              onMouseLeave={clearTitleRenameTimer}
            >
              {state.title}
            </h1>
            {titleRenameProgress > 0 && (
              <div className="absolute inset-0 flex items-center justify-center -z-0">
                <svg className="w-10 h-10 -rotate-90 opacity-40">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="40%"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="100"
                    strokeDashoffset={100 - titleRenameProgress}
                    className="text-emerald-500"
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 no-export">
            <div 
              className="relative p-2 cursor-pointer rounded-full hover:bg-red-500/10 transition-colors"
              onMouseDown={startResetTimer}
              onMouseUp={clearResetTimer}
              onMouseLeave={clearResetTimer}
              onTouchStart={startResetTimer}
              onTouchEnd={clearResetTimer}
            >
              <Trash2 size={16} className="text-red-500" />
              {resetProgress > 0 && (
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="40%"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="100"
                    strokeDashoffset={100 - resetProgress}
                    className="text-red-600"
                  />
                </svg>
              )}
            </div>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-500/20 transition-colors">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Dense Grid */}
        <div className="flex-1 flex flex-col overflow-hidden text-[6px] xs:text-[7px] sm:text-[9px]">
          {/* Header row */}
          <div className="grid grid-cols-[20px_repeat(7,1fr)_repeat(6,2fr)] gap-[1px] font-bold text-center mb-[1px] uppercase tracking-tighter">
            <div className="flex items-center justify-center">#</div>
            {CIRCLE_COLUMNS.map((col, idx) => (
              <div key={`${col}-${idx}`} className="flex items-center justify-center">{CIRCLE_LABELS[col]}</div>
            ))}
            {TASK_COLUMNS.map(col => (
              <div key={col} className="flex items-center justify-center truncate px-0.5">{col}</div>
            ))}
          </div>

          {/* Grid rows */}
          <div className="flex-1 grid grid-rows-[repeat(30,1fr)] gap-[1px]">
            {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
              <div key={day} className="grid grid-cols-[20px_repeat(7,1fr)_repeat(6,2fr)] gap-[1px]">
                <div className={`flex items-center justify-center font-bold ${cellBg} border ${borderColor}`}>
                  {day}
                </div>

                {CIRCLE_COLUMNS.map((col, idx) => {
                  const isMarked = state.data[day].circles[col].marked;
                  return (
                    <div 
                      key={`${col}-${day}-${idx}`} 
                      className={`flex items-center justify-center ${cellBg} border ${borderColor} p-0.5 relative cursor-pointer`}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        handleLongPress(`circle-${day}-${col}`, 600, () => handleCircleLongPress(day, col, rect));
                      }}
                      onTouchEnd={() => clearLongPress(`circle-${day}-${col}`)}
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        handleLongPress(`circle-${day}-${col}`, 600, () => handleCircleLongPress(day, col, rect));
                      }}
                      onMouseUp={() => clearLongPress(`circle-${day}-${col}`)}
                    >
                      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border transition-all duration-200 ${isMarked ? 'bg-emerald-500 border-emerald-500 scale-100' : 'border-slate-500 scale-100'}`} />
                    </div>
                  );
                })}

                {TASK_COLUMNS.map(task => (
                  <div 
                    key={`${task}-${day}`} 
                    className={`flex items-center justify-between ${cellBg} border ${borderColor} px-1 relative overflow-hidden group h-full`}
                    onTouchStart={() => handleLongPress(`task-${day}-${task}`, 3000, () => setActiveNotes({ day, task }))}
                    onTouchEnd={() => clearLongPress(`task-${day}-${task}`)}
                    onMouseDown={() => handleLongPress(`task-${day}-${task}`, 3000, () => setActiveNotes({ day, task }))}
                    onMouseUp={() => clearLongPress(`task-${day}-${task}`)}
                    onMouseLeave={() => clearLongPress(`task-${day}-${task}`)}
                  >
                    <span className="truncate flex-1 py-0.5 leading-none mr-3 opacity-90 select-none font-bold">
                      {state.data[day].tasks[task].text}
                    </span>
                    <button 
                      className="absolute right-0 top-0 bottom-0 px-1 no-export text-slate-500 hover:text-emerald-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocalTaskText(state.data[day].tasks[task].text);
                        setEditingTask({ day, task });
                      }}
                    >
                      <Pencil size={8} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Profile Area */}
        <footer className={`h-14 flex items-center justify-between px-4 mt-1 rounded-2xl border ${borderColor} ${isDark ? 'bg-slate-800/60' : 'bg-white shadow-sm'}`}>
          <div className="flex items-center space-x-3">
            <label className="relative cursor-pointer no-export">
              <input type="file" className="hidden" accept="image/*" onChange={handleProfileImage} />
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center overflow-hidden border border-emerald-500/30">
                {state.userImage ? <img src={state.userImage} className="w-full h-full object-cover" /> : <User size={20} className="text-emerald-600" />}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 rounded-full p-1 border-2 border-slate-900">
                <Camera size={8} className="text-white" />
              </div>
            </label>
            <div className="flex flex-col">
              <input 
                type="text"
                value={state.userName} 
                onChange={(e) => setState(prev => ({ ...prev, userName: e.target.value }))}
                className="bg-transparent border-none outline-none font-bold text-sm w-32 focus:ring-0 p-0"
              />
              <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">
                {state.userName} Complete {calculateProgress()}% Task
              </span>
            </div>
          </div>
          <button onClick={exportAsImage} className="no-export bg-emerald-600 hover:bg-emerald-500 p-2.5 rounded-full shadow-lg transition-all active:scale-90 text-white">
            <Download size={18} />
          </button>
        </footer>
      </div>

      {/* Circle Context Menu */}
      {circleContext && (
        <div className="fixed inset-0 z-50 no-export" onClick={() => setCircleContext(null)}>
          <div 
            className={`absolute shadow-2xl rounded-xl overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} py-1 w-32`}
            style={{ 
              top: Math.min(circleContext.y + 20, window.innerHeight - 100), 
              left: Math.min(circleContext.x, window.innerWidth - 140) 
            }}
          >
            <button 
              className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-emerald-500/10 flex items-center space-x-3 transition-colors"
              onClick={() => markCircle(circleContext.day, circleContext.col, true)}
            >
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Mark</span>
            </button>
            <button 
              className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-red-500/10 flex items-center space-x-3 transition-colors border-t border-slate-700/50"
              onClick={() => markCircle(circleContext.day, circleContext.col, false)}
            >
              <div className="w-3 h-3 rounded-full border border-slate-500" />
              <span>Unmark</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {isRenaming && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-6 no-export">
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} p-6 rounded-3xl w-full max-sm shadow-2xl border border-slate-700`}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <Pencil size={18} className="text-emerald-500" />
                <span>Edit Title</span>
              </h2>
              <button onClick={() => setIsRenaming(false)} className="p-1 opacity-50 hover:opacity-100"><X size={20} /></button>
            </div>
            <input 
              autoFocus
              className="w-full bg-slate-500/10 border border-slate-500/20 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 mb-6 font-medium"
              value={localTitleDraft}
              onChange={(e) => setLocalTitleDraft(e.target.value)}
              placeholder="Enter Tracker Title"
            />
            <div className="flex space-x-3">
              <button 
                className="flex-1 bg-slate-500/20 py-4 rounded-xl font-bold transition-all active:scale-95"
                onClick={() => setIsRenaming(false)}
              >
                Cancel
              </button>
              <button 
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg shadow-emerald-900/20 flex items-center justify-center space-x-2"
                onClick={saveTitle}
              >
                <Save size={18} />
                <span>Save Title</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-6 no-export">
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-700`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold text-emerald-500">{editingTask.task}</h2>
                <p className="text-xs opacity-50 font-medium">Day {editingTask.day} update</p>
              </div>
              <button onClick={() => setEditingTask(null)} className="p-1 opacity-50 hover:opacity-100"><X size={20} /></button>
            </div>
            <textarea 
              autoFocus
              className="w-full bg-slate-500/10 border border-slate-500/20 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 mb-6 font-bold min-h-[100px]"
              value={localTaskText}
              onChange={(e) => setLocalTaskText(e.target.value)}
            />
            <div className="flex space-x-3">
              <button 
                className="flex-1 bg-slate-500/20 py-4 rounded-xl font-bold transition-all active:scale-95"
                onClick={() => setEditingTask(null)}
              >
                Cancel
              </button>
              <button 
                className="flex-[2] bg-emerald-600 py-4 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg flex items-center justify-center space-x-2"
                onClick={saveTaskText}
              >
                <Save size={18} />
                <span>Save Task</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeNotes && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex flex-col p-4 no-export animate-in fade-in zoom-in duration-300">
          <div className={`flex-1 flex flex-col ${isDark ? 'bg-slate-900' : 'bg-slate-50'} rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/20`}>
            <header className="flex items-center justify-between p-6 border-b border-emerald-500/10">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-500/10 p-2 rounded-xl">
                  <Pencil size={20} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Daily Notes</h2>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">{activeNotes.task} • DAY {activeNotes.day}</p>
                </div>
              </div>
              <button onClick={() => setActiveNotes(null)} className="p-3 rounded-2xl bg-slate-500/10 hover:bg-slate-500/20 transition-colors">
                <X size={20} />
              </button>
            </header>
            <textarea 
              autoFocus
              className="flex-1 p-8 bg-transparent outline-none resize-none font-medium text-lg leading-relaxed placeholder:opacity-30"
              placeholder="Start writing your journey..."
              value={state.data[activeNotes.day].tasks[activeNotes.task].notes}
              onChange={(e) => updateTaskNotes(activeNotes.day, activeNotes.task, e.target.value)}
            />
            <footer className="p-6 border-t border-emerald-500/10 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Locked & Secured Offline</span>
              <button 
                onClick={() => setActiveNotes(null)}
                className="bg-emerald-600 px-6 py-2 rounded-xl text-white font-bold text-sm shadow-lg active:scale-95 transition-all"
              >
                Done
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
