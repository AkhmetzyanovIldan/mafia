import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { GameTable } from '../GameTable';
import { RoleName } from '@mafia/shared';

type View = 'home' | 'create' | 'join';

const EXTRA_ROLES: { name: RoleName; label: string }[] = [
  { name: RoleName.DON,        label: 'Дон' },
  { name: RoleName.ADVOCATE,   label: 'Адвокат' },
  { name: RoleName.LOVER,      label: 'Любовница' },
  { name: RoleName.JOURNALIST, label: 'Журналист' },
  { name: RoleName.SERGEANT,   label: 'Сержант' },
];

const BASE_ROLES = [RoleName.MAFIA, RoleName.COMMISSIONER, RoleName.DOCTOR, RoleName.CIVILIAN];

export function MainScreen() {
  const { token } = useAuthStore();
  const { room, playerId, gameState, phaseEndsAt, toasts, error, loading, speakingPlayers, createRoom, joinRoom, leaveRoom,
    takeSeat, leaveSeat, setReady, startGame, resetGame, submitAction, clearError, dismissToast } = useRoomStore(token);

  if (!token) {
    return (
      <div className="screen">
        <p style={{ textAlign: 'center', marginTop: '2rem' }}>Загрузка…</p>
      </div>
    );
  }

  if (room && playerId) {
    return (
      <GameTable
        room={room}
        playerId={playerId}
        gameState={gameState}
        phaseEndsAt={phaseEndsAt}
        toasts={toasts}
        loading={loading}
        error={error}
        speakingPlayers={speakingPlayers}
        onLeave={leaveRoom}
        onTakeSeat={takeSeat}
        onLeaveSeat={leaveSeat}
        onSetReady={setReady}
        onStartGame={startGame}
        onResetGame={resetGame}
        onSubmitAction={submitAction}
        onClearError={clearError}
        onDismissToast={dismissToast}
      />
    );
  }

  return (
    <div className="screen">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={clearError}>✕</button>
        </div>
      )}
      <HomeView loading={loading} onCreateRoom={(u, opts) => createRoom(u, opts)} onJoinRoom={joinRoom} />
    </div>
  );
}

interface CreateRoomOptions {
  maxPlayers?: number;
  roleNames?: RoleName[];
  phaseDurationMs?: number;
  votingDurationMs?: number;
  nightDurationMs?: number;
  lastWordEnabled?: boolean;
}

interface HomeViewProps {
  loading: boolean;
  onCreateRoom: (username: string, opts?: CreateRoomOptions) => void;
  onJoinRoom: (code: string, username: string) => void;
}

function HomeView({ loading, onCreateRoom, onJoinRoom }: HomeViewProps) {
  const [view, setView] = useState<View>('home');

  if (view === 'create') {
    return <CreateRoomForm loading={loading} onSubmit={(u, opts) => onCreateRoom(u, opts)} onBack={() => setView('home')} />;
  }
  if (view === 'join') {
    return <JoinRoomForm loading={loading} onSubmit={onJoinRoom} onBack={() => setView('home')} />;
  }

  return (
    <div className="home">
      <h1 className="title">Project Mafia</h1>
      <div className="button-group">
        <button className="btn btn-primary" onClick={() => setView('create')} disabled={loading}>
          Создать комнату
        </button>
        <button className="btn btn-secondary" onClick={() => setView('join')} disabled={loading}>
          Войти в комнату
        </button>
      </div>
    </div>
  );
}

function CreateRoomForm({ loading, onSubmit, onBack }: {
  loading: boolean;
  onSubmit: (username: string, opts?: CreateRoomOptions) => void;
  onBack: () => void;
}) {
  const { username: savedUsername } = useAuthStore();
  const [username, setUsername] = useState(savedUsername ?? '');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [extraRoles, setExtraRoles] = useState<RoleName[]>([]);
  const [phaseSec, setPhaseSec] = useState(60);
  const [votingSec, setVotingSec] = useState(30);
  const [nightSec, setNightSec] = useState(45);
  const [lastWord, setLastWord] = useState(true);

  const toggleRole = (role: RoleName) => {
    setExtraRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    onSubmit(username.trim(), {
      maxPlayers,
      roleNames: [...BASE_ROLES, ...extraRoles],
      phaseDurationMs: phaseSec * 1000,
      votingDurationMs: votingSec * 1000,
      nightDurationMs: nightSec * 1000,
      lastWordEnabled: lastWord,
    });
  };
  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Создать комнату</h2>
      <label>
        Ваше имя
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
          placeholder="Введите имя" maxLength={32} required autoFocus />
      </label>
      <label>
        Игроков: {maxPlayers}
        <input type="range" min={4} max={16} value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))} />
      </label>
      <div className="roles-section">
        <p className="roles-label">Дополнительные роли</p>
        <div className="roles-grid">
          {EXTRA_ROLES.map(({ name, label }) => (
            <button
              key={name}
              type="button"
              className={`role-toggle ${extraRoles.includes(name) ? 'role-toggle-on' : ''}`}
              onClick={() => toggleRole(name)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="timers-section">
        <p className="roles-label">Таймеры фаз</p>
        <label>Речь/обсуждение: {phaseSec}с
          <input type="range" min={15} max={180} step={5} value={phaseSec}
            onChange={(e) => setPhaseSec(Number(e.target.value))} />
        </label>
        <label>Голосование: {votingSec}с
          <input type="range" min={10} max={120} step={5} value={votingSec}
            onChange={(e) => setVotingSec(Number(e.target.value))} />
        </label>
        <label>Ночь: {nightSec}с
          <input type="range" min={15} max={120} step={5} value={nightSec}
            onChange={(e) => setNightSec(Number(e.target.value))} />
        </label>
      </div>
      <label className="last-word-toggle">
        <input type="checkbox" checked={lastWord} onChange={(e) => setLastWord(e.target.checked)} />
        Последнее слово перед выбыванием
      </label>
      <div className="button-group">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={loading}>Назад</button>
        <button type="submit" className="btn btn-primary" disabled={loading || !username.trim()}>
          {loading ? 'Создание…' : 'Создать'}
        </button>
      </div>
    </form>
  );
}

function JoinRoomForm({ loading, onSubmit, onBack }: {
  loading: boolean;
  onSubmit: (code: string, username: string) => void;
  onBack: () => void;
}) {
  const { username: savedUsername } = useAuthStore();
  const [code, setCode] = useState('');
  const [username, setUsername] = useState(savedUsername ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim() && username.trim()) onSubmit(code.trim().toUpperCase(), username.trim());
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Войти в комнату</h2>
      <label>
        Код комнаты
        <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="AB3X7K" maxLength={6} required autoFocus />
      </label>
      <label>
        Ваше имя
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
          placeholder="Введите имя" maxLength={32} required />
      </label>
      <div className="button-group">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={loading}>Назад</button>
        <button type="submit" className="btn btn-primary" disabled={loading || !code.trim() || !username.trim()}>
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </div>
    </form>
  );
}
