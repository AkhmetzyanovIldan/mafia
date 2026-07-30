import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { GameTable } from '../GameTable';

type View = 'home' | 'create' | 'join';

export function MainScreen() {
  const { token } = useAuthStore();
  const { room, playerId, gameState, error, loading, createRoom, joinRoom, leaveRoom,
    takeSeat, setReady, startGame, clearError } = useRoomStore(token);

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
        loading={loading}
        error={error}
        onLeave={leaveRoom}
        onTakeSeat={takeSeat}
        onSetReady={setReady}
        onStartGame={startGame}
        onClearError={clearError}
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
      <HomeView loading={loading} onCreateRoom={createRoom} onJoinRoom={joinRoom} />
    </div>
  );
}

interface HomeViewProps {
  loading: boolean;
  onCreateRoom: (username: string, maxPlayers?: number) => void;
  onJoinRoom: (code: string, username: string) => void;
}

function HomeView({ loading, onCreateRoom, onJoinRoom }: HomeViewProps) {
  const [view, setView] = useState<View>('home');

  if (view === 'create') {
    return <CreateRoomForm loading={loading} onSubmit={onCreateRoom} onBack={() => setView('home')} />;
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
  onSubmit: (username: string, maxPlayers?: number) => void;
  onBack: () => void;
}) {
  const { username: savedUsername } = useAuthStore();
  const [username, setUsername] = useState(savedUsername ?? '');
  const [maxPlayers, setMaxPlayers] = useState(8);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (username.trim()) onSubmit(username.trim(), maxPlayers);
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
