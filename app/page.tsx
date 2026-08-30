'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
type Mode = 'focus' | 'rest';
type SoundType = 'white' | 'pink' | 'brown' | 'airplane' | 'library' | 'cafe' | 'wind';
type Task = { id: number; text: string; done: boolean };
type Session = { id: number; task: string; minutes: number; time: string };
const modes: Record<Mode, { label: string; minutes: number }> = { focus: { label: '집중', minutes: 25 }, rest: { label: '휴식', minutes: 10 } };
const pad = (value: number) => String(value).padStart(2, '0');
const playChime = (volume: number) => {
  const context = new AudioContext();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(volume / 100 * 0.35, context.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.8);
  gain.connect(context.destination);
  [659.25, 987.77].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    oscillator.connect(gain); oscillator.start(context.currentTime + index * 0.16); oscillator.stop(context.currentTime + 1.8);
  });
  window.setTimeout(() => context.close(), 2000);
};

export default function Home() {
  const [mode, setMode] = useState<Mode>('focus');
  const [seconds, setSeconds] = useState(modes.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [draft, setDraft] = useState('');
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [focusDuration, setFocusDuration] = useState(25);
  const [restDuration, setRestDuration] = useState(10);
  const [noiseType, setNoiseType] = useState<SoundType>('brown');
  const [noiseVolume, setNoiseVolume] = useState(30);
  const [noiseOn, setNoiseOn] = useState(false);
  const [autoNoise, setAutoNoise] = useState(true);
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [chimeVolume, setChimeVolume] = useState(65);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedTasks = localStorage.getItem('moru-tasks');
    const savedSessions = localStorage.getItem('moru-sessions');
    const savedDuration = Number(localStorage.getItem('moru-focus-duration'));
    const savedRestDuration = Number(localStorage.getItem('moru-rest-duration'));
    const savedNoiseType = localStorage.getItem('moru-noise-type') as SoundType | null;
    const savedNoiseVolume = Number(localStorage.getItem('moru-noise-volume'));
    const savedAutoNoise = localStorage.getItem('moru-auto-noise');
    const savedChimeEnabled = localStorage.getItem('moru-chime-enabled');
    const savedChimeVolume = Number(localStorage.getItem('moru-chime-volume'));
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedSessions) setSessions(JSON.parse(savedSessions));
    if (savedDuration >= 1 && savedDuration <= 120) { setFocusDuration(savedDuration); setSeconds(savedDuration * 60); }
    if (savedRestDuration >= 1 && savedRestDuration <= 120) setRestDuration(savedRestDuration);
    if (savedNoiseType && ['white', 'pink', 'brown', 'airplane', 'library', 'cafe', 'wind'].includes(savedNoiseType)) setNoiseType(savedNoiseType);
    if (savedNoiseVolume >= 0 && savedNoiseVolume <= 100) setNoiseVolume(savedNoiseVolume);
    if (savedAutoNoise !== null) setAutoNoise(savedAutoNoise === 'true');
    if (savedChimeEnabled !== null) setChimeEnabled(savedChimeEnabled === 'true');
    if (savedChimeVolume >= 0 && savedChimeVolume <= 100) setChimeVolume(savedChimeVolume);
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) { localStorage.setItem('moru-tasks', JSON.stringify(tasks)); localStorage.setItem('moru-sessions', JSON.stringify(sessions)); } }, [tasks, sessions, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem('moru-focus-duration', String(focusDuration)); }, [focusDuration, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem('moru-rest-duration', String(restDuration)); }, [restDuration, hydrated]);
  useEffect(() => { if (hydrated) { localStorage.setItem('moru-noise-type', noiseType); localStorage.setItem('moru-noise-volume', String(noiseVolume)); localStorage.setItem('moru-auto-noise', String(autoNoise)); } }, [noiseType, noiseVolume, autoNoise, hydrated]);
  useEffect(() => { if (hydrated) { localStorage.setItem('moru-chime-enabled', String(chimeEnabled)); localStorage.setItem('moru-chime-volume', String(chimeVolume)); } }, [chimeEnabled, chimeVolume, hydrated]);
  useEffect(() => {
    if (!noiseOn) { audioContextRef.current?.close(); audioContextRef.current = null; ambientAudioRef.current?.pause(); ambientAudioRef.current = null; return; }
    const audioFiles: Partial<Record<SoundType, string>> = { airplane: '/audio/airplane.mp3', library: '/audio/library.wav', cafe: '/audio/cafe.mp3', wind: '/audio/wind.wav' };
    const audioFile = audioFiles[noiseType];
    if (audioFile) {
      const audio = new Audio(audioFile);
      audio.loop = true; audio.volume = noiseVolume / 100; ambientAudioRef.current = audio;
      audio.play().catch(() => setNoiseOn(false));
      return () => { audio.pause(); audio.src = ''; if (ambientAudioRef.current === audio) ambientAudioRef.current = null; };
    }
    const context = new AudioContext();
    const frameCount = context.sampleRate * 2;
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < frameCount; i += 1) {
      const white = Math.random() * 2 - 1;
      if (noiseType === 'white') data[i] = white * 0.55;
      else if (noiseType === 'brown') { brown = (brown + 0.02 * white) / 1.02; data[i] = brown * 3.5; }
      else { b0 = .99886*b0+white*.0555179; b1 = .99332*b1+white*.0750759; b2 = .969*b2+white*.153852; b3 = .8665*b3+white*.3104856; b4 = .55*b4+white*.5329522; b5 = -.7616*b5-white*.016898; data[i] = (b0+b1+b2+b3+b4+b5+b6+white*.5362)*.11; b6 = white*.115926; }
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer; source.loop = true; gain.gain.value = noiseVolume / 100 * 0.45;
    source.connect(gain).connect(context.destination); source.start();
    audioContextRef.current = context;
    return () => { source.stop(); context.close(); if (audioContextRef.current === context) audioContextRef.current = null; };
  }, [noiseOn, noiseType, noiseVolume]);
  useEffect(() => { if (autoNoise) setNoiseOn(running && mode === 'focus'); }, [running, mode, autoNoise]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((current) => {
      if (current > 1) return current - 1;
      setRunning(false);
      if (chimeEnabled) playChime(chimeVolume);
      if (mode === 'focus') {
        const active = tasks.find((task) => task.id === selectedTask);
        setSessions((prev) => [{ id: Date.now(), task: active?.text || '자유 집중', minutes: focusDuration, time: new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date()) }, ...prev].slice(0, 8));
      }
      return (mode === 'focus' ? focusDuration : restDuration) * 60;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running, mode, selectedTask, tasks, focusDuration, restDuration, chimeEnabled, chimeVolume]);
  useEffect(() => { document.title = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)} · 모루`; }, [seconds]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.code === 'Space' && event.target === document.body) { event.preventDefault(); setRunning((value) => !value); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);

  const focusMinutes = useMemo(() => sessions.reduce((total, session) => total + session.minutes, 0), [sessions]);
  const changeMode = (nextMode: Mode) => { setMode(nextMode); setSeconds((nextMode === 'focus' ? focusDuration : restDuration) * 60); setRunning(false); };
  const changeFocusDuration = (value: number) => { const next = Math.min(120, Math.max(1, value)); setFocusDuration(next); if (mode === 'focus' && !running) setSeconds(next * 60); };
  const changeRestDuration = (value: number) => { const next = Math.min(120, Math.max(1, value)); setRestDuration(next); if (mode === 'rest' && !running) setSeconds(next * 60); };
  const addTask = (event: React.FormEvent) => { event.preventDefault(); const text = draft.trim(); if (!text) return; const next = { id: Date.now(), text, done: false }; setTasks((prev) => [...prev, next]); setSelectedTask((current) => current ?? next.id); setDraft(''); };

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#timer" aria-label="모루 홈"><span className="brand-mark">m</span><span>모루</span></a><div className="today-stat"><span className="pulse-dot" /> 오늘 {focusMinutes}분 집중</div></header>
    <div className="workspace">
      <section className="timer-panel" id="timer">
        <p className="eyebrow">FOCUS ROOM</p>
        <div className="mode-tabs" role="tablist" aria-label="타이머 모드">{(Object.keys(modes) as Mode[]).map((key) => <button key={key} className={mode === key ? 'active' : ''} onClick={() => changeMode(key)} role="tab" aria-selected={mode === key}>{modes[key].label}</button>)}</div>
        <div className={`timer ${running ? 'running' : ''}`} aria-live="polite"><span>{pad(Math.floor(seconds / 60))}</span><i>:</i><span>{pad(seconds % 60)}</span></div>
        <p className="current-task">{mode === 'rest' ? '잠시 화면에서 눈을 떼어보세요' : tasks.find((task) => task.id === selectedTask)?.text || '집중할 일을 골라주세요'}</p>
        <div className="timer-actions">
          <button className="reset-button" onClick={() => { setSeconds((mode === 'focus' ? focusDuration : restDuration) * 60); setRunning(false); }} aria-label="타이머 초기화">↺</button>
          <button className="start-button" onClick={() => setRunning((value) => !value)}>{running ? '잠시 멈춤' : mode === 'focus' ? '집중 시작' : '휴식 시작'} <span>{running ? 'Ⅱ' : '▶'}</span></button>
          <button className="skip-button" onClick={() => changeMode(mode === 'focus' ? 'rest' : 'focus')} aria-label="다음 모드">→</button>
        </div><p className="shortcut">SPACE 키로 시작하고 멈출 수 있어요</p>
      </section>
      <aside className="side-panel">
        <section className="noise-card" aria-label="집중 사운드 설정">
          <div className="noise-heading"><div><p className="section-kicker">AMBIENCE</p><strong>집중 사운드</strong></div><button className={`noise-toggle ${noiseOn ? 'on' : ''}`} onClick={() => setNoiseOn((value) => !value)} aria-pressed={noiseOn}>{noiseOn ? '켜짐' : '꺼짐'}</button></div>
          <div className="noise-types" role="group" aria-label="소음 종류">{([['white','화이트'],['pink','핑크'],['brown','브라운'],['airplane','비행기'],['library','도서관'],['cafe','카페'],['wind','바람']] as [SoundType,string][]).map(([key,label]) => <button key={key} className={noiseType === key ? 'active' : ''} onClick={() => setNoiseType(key)}>{label}</button>)}</div>
          <label className="volume-row"><span>볼륨</span><input type="range" min="0" max="100" value={noiseVolume} onChange={(event) => setNoiseVolume(Number(event.target.value))} /><output>{noiseVolume}%</output></label>
          <label className="auto-noise"><input type="checkbox" checked={autoNoise} onChange={(event) => setAutoNoise(event.target.checked)} /><span>집중 타이머와 함께 켜고 끄기</span></label>
          <div className="chime-setting"><label><input type="checkbox" checked={chimeEnabled} onChange={(event) => setChimeEnabled(event.target.checked)} /><span>종료 알림음</span></label><input aria-label="알림음 볼륨" type="range" min="0" max="100" value={chimeVolume} disabled={!chimeEnabled} onChange={(event) => setChimeVolume(Number(event.target.value))} /><button disabled={!chimeEnabled} onClick={() => playChime(chimeVolume)}>미리 듣기</button></div>
        </section>
        <section className="duration-card" aria-label="타이머 시간 설정">
          <p className="section-kicker">TIMER SETTINGS</p>
          <div className="duration-row"><strong>집중 시간</strong><div className="duration-control">
            <button onClick={() => changeFocusDuration(focusDuration - 5)} disabled={running || focusDuration <= 1} aria-label="집중 시간 줄이기">−</button>
            <label><input type="number" min="1" max="120" value={focusDuration} disabled={running} onChange={(event) => changeFocusDuration(Number(event.target.value))} /><span>분</span></label>
            <button onClick={() => changeFocusDuration(focusDuration + 5)} disabled={running || focusDuration >= 120} aria-label="집중 시간 늘리기">+</button>
          </div></div>
          <div className="duration-row"><strong>휴식 시간</strong><div className="duration-control">
            <button onClick={() => changeRestDuration(restDuration - 5)} disabled={running || restDuration <= 1} aria-label="휴식 시간 줄이기">−</button>
            <label><input type="number" min="1" max="120" value={restDuration} disabled={running} onChange={(event) => changeRestDuration(Number(event.target.value))} /><span>분</span></label>
            <button onClick={() => changeRestDuration(restDuration + 5)} disabled={running || restDuration >= 120} aria-label="휴식 시간 늘리기">+</button>
          </div></div>
        </section>
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
    </div><footer><span>오늘 할 수 있는 만큼, 조용히.</span><details className="credits"><summary>음원 출처</summary><p>비행기: courter · 도서관: xkeril · 카페: evsecrets (CC0)<br />바람: kevp888 / Kevin Luce (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>)</p></details></footer>
  </main>;
}
