'use client';

import { useEffect, useMemo, useState } from 'react';
type Mode = 'focus' | 'short' | 'long';
type Task = { id: number; text: string; done: boolean };
type Session = { id: number; task: string; minutes: number; time: string };
const modes: Record<Mode, { label: string; minutes: number }> = { focus: { label: '집중', minutes: 25 }, short: { label: '짧은 휴식', minutes: 5 }, long: { label: '긴 휴식', minutes: 15 } };
const pad = (value: number) => String(value).padStart(2, '0');

export default function Home() {
  const [mode, setMode] = useState<Mode>('focus');
  const [seconds, setSeconds] = useState(modes.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [draft, setDraft] = useState('');
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedTasks = localStorage.getItem('moru-tasks');
    const savedSessions = localStorage.getItem('moru-sessions');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedSessions) setSessions(JSON.parse(savedSessions));
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) { localStorage.setItem('moru-tasks', JSON.stringify(tasks)); localStorage.setItem('moru-sessions', JSON.stringify(sessions)); } }, [tasks, sessions, hydrated]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((current) => {
      if (current > 1) return current - 1;
      setRunning(false);
      if (mode === 'focus') {
        const active = tasks.find((task) => task.id === selectedTask);
        setSessions((prev) => [{ id: Date.now(), task: active?.text || '자유 집중', minutes: modes.focus.minutes, time: new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date()) }, ...prev].slice(0, 8));
      }
      return modes[mode].minutes * 60;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running, mode, selectedTask, tasks]);
  useEffect(() => { document.title = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)} · 모루`; }, [seconds]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.code === 'Space' && event.target === document.body) { event.preventDefault(); setRunning((value) => !value); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);

  const focusMinutes = useMemo(() => sessions.reduce((total, session) => total + session.minutes, 0), [sessions]);
  const changeMode = (nextMode: Mode) => { setMode(nextMode); setSeconds(modes[nextMode].minutes * 60); setRunning(false); };
  const addTask = (event: React.FormEvent) => { event.preventDefault(); const text = draft.trim(); if (!text) return; const next = { id: Date.now(), text, done: false }; setTasks((prev) => [...prev, next]); setSelectedTask((current) => current ?? next.id); setDraft(''); };

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#timer" aria-label="모루 홈"><span className="brand-mark">m</span><span>모루</span></a><div className="today-stat"><span className="pulse-dot" /> 오늘 {focusMinutes}분 집중</div></header>
    <div className="workspace">
      <section className="timer-panel" id="timer">
        <p className="eyebrow">FOCUS ROOM</p>
        <div className="mode-tabs" role="tablist" aria-label="타이머 모드">{(Object.keys(modes) as Mode[]).map((key) => <button key={key} className={mode === key ? 'active' : ''} onClick={() => changeMode(key)} role="tab" aria-selected={mode === key}>{modes[key].label}</button>)}</div>
        <div className={`timer ${running ? 'running' : ''}`} aria-live="polite"><span>{pad(Math.floor(seconds / 60))}</span><i>:</i><span>{pad(seconds % 60)}</span></div>
        <p className="current-task">{tasks.find((task) => task.id === selectedTask)?.text || '집중할 일을 골라주세요'}</p>
        <div className="timer-actions">
          <button className="reset-button" onClick={() => { setSeconds(modes[mode].minutes * 60); setRunning(false); }} aria-label="타이머 초기화">↺</button>
          <button className="start-button" onClick={() => setRunning((value) => !value)}>{running ? '잠시 멈춤' : '집중 시작'} <span>{running ? 'Ⅱ' : '▶'}</span></button>
          <button className="skip-button" onClick={() => changeMode(mode === 'focus' ? 'short' : 'focus')} aria-label="다음 모드">→</button>
        </div><p className="shortcut">SPACE 키로 시작하고 멈출 수 있어요</p>
      </section>
      <aside className="side-panel">
        <section className="card task-card">
          <div className="card-heading"><div><p className="section-kicker">TODAY</p><h2>오늘 할 일</h2></div><span className="count">{tasks.filter((task) => task.done).length}/{tasks.length}</span></div>
          <form onSubmit={addTask} className="task-form"><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="공부할 내용을 적어보세요" aria-label="새 할 일" /><button aria-label="할 일 추가">+</button></form>
          <div className="task-list">{tasks.length === 0 && <div className="empty-state"><span>✎</span><p>첫 번째 공부 계획을 적어보세요.</p></div>}{tasks.map((task) => <div className={`task-row ${task.done ? 'done' : ''} ${selectedTask === task.id ? 'selected' : ''}`} key={task.id}>
            <button className="check" onClick={() => setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} aria-label={`${task.text} 완료 표시`}>{task.done ? '✓' : ''}</button>
            <button className="task-name" onClick={() => setSelectedTask(task.id)}>{task.text}</button><button className="delete" onClick={() => setTasks((prev) => prev.filter((item) => item.id !== task.id))} aria-label={`${task.text} 삭제`}>×</button>
          </div>)}</div>
        </section>
        <section className="card history-card"><div className="card-heading"><div><p className="section-kicker">LOG</p><h2>오늘의 기록</h2></div><span className="session-total">● {sessions.length}회</span></div>{sessions.length === 0 ? <p className="history-empty">아직 완료한 집중 세션이 없어요.</p> : sessions.slice(0, 3).map((session) => <div className="history-row" key={session.id}><span className="history-dot" /><div><strong>{session.task}</strong><small>{session.minutes}분 집중</small></div><time>{session.time}</time></div>)}</section>
      </aside>
    </div><footer>오늘 할 수 있는 만큼, 조용히.</footer>
  </main>;
}
