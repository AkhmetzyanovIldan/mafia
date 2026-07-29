import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import type { RoomStateDto, GameStateDto } from '@mafia/shared';
import { GameSessionStatus, GamePhase } from '@mafia/shared';

type View = 'home' | 'create' | 'join';

export function MainScreen() {
  const { token, loginAsGuest } = useAuthStore();
  const { room, playerId, gameState, error, loading, createRoom, joinRoom, leaveRoom, startGame, clearError } =
    useRoomStore(token);

  if (!token) {
    return <GuestLoginView onLogin={loginAsGuest} />;
  }

  if (gameState) {
    return <GameView gameState={gameState} onLeave={leaveRoom} />;
  }

  if (room && playerId) {
    return (
      <RoomLobby
        room={room}
        playerId={playerId}
        loading={loading}
        error={error}
        onLeave={leaveRoom}
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

// Guest login

interface GuestLoginViewProps {
  onLogin: (username: string) => Promise<void>;
}

function GuestLoginView({ onLogin }: GuestLoginViewProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    try {
      await onLogin(username.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Enter your name</h2>
      <label>
        Username
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your name"
          maxLength={32}
          required
          autoFocus
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={loading || !username.trim()}>
        {loading ? 'Loading…' : 'Continue'}
      </button>
    </form>
  );
}

// Home / Create / Join forms

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
          Create Room
        </button>
        <button className="btn btn-secondary" onClick={() => setView('join')} disabled={loading}>
          Join Room
        </button>
      </div>
    </div>
  );
}

interface CreateRoomFormProps {
  loading: boolean;
  onSubmit: (username: string, maxPlayers?: number) => void;
  onBack: () => void;
}

function CreateRoomForm({ loading, onSubmit, onBack }: CreateRoomFormProps) {
  const { username: savedUsername } = useAuthStore();
  const [username, setUsername] = useState(savedUsername ?? '');
  const [maxPlayers, setMaxPlayers] = useState(8);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (username.trim()) onSubmit(username.trim(), maxPlayers);
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Create Room</h2>
      <label>
        Your name
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your name"
          maxLength={32}
          required
          autoFocus
        />
      </label>
      <label>
        Max players ({maxPlayers})
        <input
          type="range"
          min={4}
          max={16}
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
        />
      </label>
      <div className="button-group">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={loading}>
          Back
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading || !username.trim()}>
          {loading ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  );
}

interface JoinRoomFormProps {
  loading: boolean;
  onSubmit: (code: string, username: string) => void;
  onBack: () => void;
}

function JoinRoomForm({ loading, onSubmit, onBack }: JoinRoomFormProps) {
  const { username: savedUsername } = useAuthStore();
  const [code, setCode] = useState('');
  const [username, setUsername] = useState(savedUsername ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim() && username.trim()) onSubmit(code.trim().toUpperCase(), username.trim());
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Join Room</h2>
      <label>
        Room code
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. AB3X7K"
          maxLength={6}
          required
          autoFocus
        />
      </label>
      <label>
        Your name
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your name"
          maxLength={32}
          required
        />
      </label>
      <div className="button-group">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={loading}>
          Back
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !code.trim() || !username.trim()}
        >
          {loading ? 'Joining…' : 'Join'}
        </button>
      </div>
    </form>
  );
}

// Room Lobby

interface RoomLobbyProps {
  room: RoomStateDto;
  playerId: string;
  loading: boolean;
  error: string | null;
  onLeave: () => void;
  onStartGame: () => void;
  onClearError: () => void;
}

function RoomLobby({ room, playerId, loading, error, onLeave, onStartGame, onClearError }: RoomLobbyProps) {
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const canStart = isHost && room.players.length >= 4;

  return (
    <div className="screen">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={onClearError}>✕</button>
        </div>
      )}
      <div className="lobby">
        <div className="lobby-header">
          <div>
            <h2>Room Lobby</h2>
            <p className="room-code">
              Code: <strong>{room.code}</strong>
            </p>
          </div>
          <button className="btn btn-danger" onClick={onLeave} disabled={loading}>
            Leave
          </button>
        </div>

        <div className="player-count">
          {room.players.length} / {room.maxPlayers} players
        </div>

        <ul className="player-list">
          {room.players.map((player) => (
            <li key={player.id} className={`player-item${player.id === playerId ? ' player-me' : ''}`}>
              <span className="player-name">{player.username}</span>
              {player.isHost && <span className="badge badge-host">Host</span>}
              {player.id === playerId && <span className="badge badge-you">You</span>}
            </li>
          ))}
        </ul>

        {isHost ? (
          <button
            className="btn btn-primary btn-full"
            onClick={onStartGame}
            disabled={loading || !canStart}
          >
            {loading ? 'Starting…' : canStart ? 'Start Game' : `Need ${4 - room.players.length} more player(s)`}
          </button>
        ) : (
          <p className="lobby-hint">Waiting for the host to start the game…</p>
        )}
      </div>
    </div>
  );
}

// Game Session View

const PHASE_LABELS: Record<GamePhase, string> = {
  [GamePhase.WAITING]:        'Waiting',
  [GamePhase.PREPARING]:      'Preparing',
  [GamePhase.NIGHT]:          'Night',
  [GamePhase.MORNING]:        'Morning',
  [GamePhase.DAY_SPEECH]:     'Day — Speech',
  [GamePhase.DAY_DISCUSSION]: 'Day — Discussion',
  [GamePhase.VOTING]:         'Voting',
  [GamePhase.LAST_WORD]:      'Last Word',
  [GamePhase.CHECK_VICTORY]:  'Checking Victory',
  [GamePhase.GAME_OVER]:      'Game Over',
};

interface GameViewProps {
  gameState: GameStateDto;
  onLeave: () => void;
}

function GameView({ gameState, onLeave }: GameViewProps) {
  const statusLabel: Record<GameSessionStatus, string> = {
    [GameSessionStatus.WAITING]: 'Waiting',
    [GameSessionStatus.IN_PROGRESS]: 'In Progress',
    [GameSessionStatus.FINISHED]: 'Finished',
  };

  return (
    <div className="screen">
      <div className="game-view">
        <div className="lobby-header">
          <h2>Game Session</h2>
          <button className="btn btn-danger" onClick={onLeave}>
            Leave
          </button>
        </div>

        <div className="game-info">
          <div className="game-info-row">
            <span className="game-info-label">Phase</span>
            <span className={`badge badge-phase badge-phase-${gameState.currentPhase.toLowerCase()}`}>
              {PHASE_LABELS[gameState.currentPhase]}
            </span>
          </div>
          <div className="game-info-row">
            <span className="game-info-label">Status</span>
            <span className={`badge badge-status badge-status-${gameState.status.toLowerCase()}`}>
              {statusLabel[gameState.status]}
            </span>
          </div>
          <div className="game-info-row">
            <span className="game-info-label">Started At</span>
            <span className="game-info-value">
              {gameState.startedAt ? new Date(gameState.startedAt).toLocaleTimeString() : '—'}
            </span>
          </div>
          <div className="game-info-row">
            <span className="game-info-label">Game ID</span>
            <span className="game-info-value game-id">{gameState.gameId}</span>
          </div>
        </div>

        <ul className="player-list">
          {gameState.players.map((player) => (
            <li key={player.id} className="player-item">
              <span className="player-name">{player.username}</span>
              {player.isHost && <span className="badge badge-host">Host</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
