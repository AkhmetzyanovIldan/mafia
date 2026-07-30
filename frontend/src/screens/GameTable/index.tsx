import type { RoomStateDto, GameStateDto, PlayerDto, GamePlayerDto } from '@mafia/shared';
import { GamePhase, PlayerStatus } from '@mafia/shared';

const PHASE_LABELS: Record<GamePhase, string> = {
  [GamePhase.WAITING]:        'Ожидание',
  [GamePhase.PREPARING]:      'Подготовка',
  [GamePhase.NIGHT]:          'Ночь',
  [GamePhase.MORNING]:        'Утро',
  [GamePhase.DAY_SPEECH]:     'Выступления',
  [GamePhase.DAY_DISCUSSION]: 'Обсуждение',
  [GamePhase.VOTING]:         'Голосование',
  [GamePhase.LAST_WORD]:      'Последнее слово',
  [GamePhase.CHECK_VICTORY]:  'Проверка победы',
  [GamePhase.GAME_OVER]:      'Конец игры',
};

interface GameTableProps {
  room: RoomStateDto;
  playerId: string;
  gameState: GameStateDto | null;
  loading: boolean;
  error: string | null;
  onLeave: () => void;
  onTakeSeat: (seat: number) => void;
  onSetReady: (isReady: boolean) => void;
  onStartGame: () => void;
  onClearError: () => void;
}

export function GameTable({
  room, playerId, gameState, loading, error,
  onLeave, onTakeSeat, onSetReady, onStartGame, onClearError,
}: GameTableProps) {
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const isSeated = (me?.seat ?? null) !== null;
  const isReady = me?.isReady ?? false;
  const phase = gameState?.currentPhase ?? GamePhase.WAITING;
  const isPlaying = gameState !== null;
  const seatedPlayers = room.players.filter((p) => p.seat !== null);
  const allReady = seatedPlayers.length >= 4 && seatedPlayers.every((p) => p.isReady);

  return (
    <div className="table-screen">
      <TopBar phase={phase} roomCode={room.code} isPlaying={isPlaying} onLeave={onLeave} />

      {error && (
        <div className="error-banner table-error">
          <span>{error}</span>
          <button onClick={onClearError}>✕</button>
        </div>
      )}

      <div className="table-body">
        <SeatingArea
          room={room}
          playerId={playerId}
          gameState={gameState}
          isPlaying={isPlaying}
          onTakeSeat={onTakeSeat}
        />
        <CenterArea phase={phase} gameState={gameState} room={room} />
      </div>

      <BottomBar
        isPlaying={isPlaying}
        isSeated={isSeated}
        isReady={isReady}
        isHost={isHost}
        allReady={allReady}
        loading={loading}
        onSetReady={onSetReady}
        onStartGame={onStartGame}
      />
    </div>
  );
}

function TopBar({ phase, roomCode, isPlaying, onLeave }: {
  phase: GamePhase; roomCode: string; isPlaying: boolean; onLeave: () => void;
}) {
  return (
    <div className="top-bar">
      <span className="room-code-label">{roomCode}</span>
      <div className="top-bar-center">
        {isPlaying && <span className={`phase-badge phase-${phase.toLowerCase()}`}>{PHASE_LABELS[phase]}</span>}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onLeave}>Выйти</button>
    </div>
  );
}

function SeatingArea({ room, playerId, gameState, isPlaying, onTakeSeat }: {
  room: RoomStateDto; playerId: string; gameState: GameStateDto | null;
  isPlaying: boolean; onTakeSeat: (seat: number) => void;
}) {
  const seats = Array.from({ length: room.maxPlayers }, (_, i) => i + 1);
  const half = Math.ceil(seats.length / 2);

  const getPlayer = (seat: number): PlayerDto | undefined => room.players.find((p) => p.seat === seat);
  const getGamePlayer = (seat: number): GamePlayerDto | undefined => {
    const p = getPlayer(seat);
    return p && gameState ? gameState.players.find((gp) => gp.id === p.id) : undefined;
  };

  return (
    <div className="seating-area">
      <div className="seats-column">
        {seats.slice(0, half).map((seat) => (
          <Seat key={seat} seat={seat} player={getPlayer(seat)} gamePlayer={getGamePlayer(seat)}
            playerId={playerId} isPlaying={isPlaying} onTakeSeat={onTakeSeat} />
        ))}
      </div>
      <div className="seats-column">
        {seats.slice(half).map((seat) => (
          <Seat key={seat} seat={seat} player={getPlayer(seat)} gamePlayer={getGamePlayer(seat)}
            playerId={playerId} isPlaying={isPlaying} onTakeSeat={onTakeSeat} />
        ))}
      </div>
    </div>
  );
}

function Seat({ seat, player, gamePlayer, playerId, isPlaying, onTakeSeat }: {
  seat: number; player: PlayerDto | undefined; gamePlayer: GamePlayerDto | undefined;
  playerId: string; isPlaying: boolean; onTakeSeat: (seat: number) => void;
}) {
  const isEmpty = !player;
  const isMe = player?.id === playerId;
  const isDead = gamePlayer?.status === PlayerStatus.DEAD;

  let cls = 'seat';
  if (isEmpty) cls += ' seat-empty';
  else if (isDead) cls += ' seat-dead';
  else if (isMe) cls += ' seat-me';
  else cls += ' seat-occupied';

  return (
    <div className={cls} onClick={() => isEmpty && !isPlaying && onTakeSeat(seat)}>
      <span className="seat-number">{seat}</span>
      {isEmpty ? (
        <span className="seat-empty-label">{isPlaying ? '—' : 'Свободно'}</span>
      ) : (
        <div className="seat-player">
          <span className="seat-avatar">{player!.username[0].toUpperCase()}</span>
          <div className="seat-info">
            <span className="seat-name">{player!.username}</span>
            {!isPlaying && player!.isReady && <span className="seat-ready-mark">✓</span>}
            {isDead && <span className="seat-dead-mark">✝</span>}
            {isMe && gamePlayer?.role && <span className="seat-role">{gamePlayer.role.name}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function CenterArea({ phase, gameState, room }: {
  phase: GamePhase; gameState: GameStateDto | null; room: RoomStateDto;
}) {
  if (!gameState) {
    const seatedCount = room.players.filter((p) => p.seat !== null).length;
    return (
      <div className="center-area">
        <p className="center-message">Мест занято: <strong>{seatedCount} / {room.maxPlayers}</strong></p>
        <p className="center-hint">Нажмите на свободное место чтобы сесть</p>
      </div>
    );
  }

  if (phase === GamePhase.GAME_OVER) {
    const w = gameState.winner;
    return (
      <div className="center-area">
        <p className="center-winner">
          {w === 'TOWN_WINS' ? '🏆 Победили мирные!' : w === 'MAFIA_WINS' ? '🔪 Победила мафия!' : 'Ничья'}
        </p>
        <div className="roles-reveal">
          {gameState.players.map((p) => (
            <div key={p.id} className="role-reveal-item">
              <span>{p.username}</span>
              <span className="role-name">{p.role?.name ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hints: Partial<Record<GamePhase, string>> = {
    [GamePhase.NIGHT]: 'Город засыпает…',
    [GamePhase.MORNING]: 'Город просыпается',
    [GamePhase.DAY_SPEECH]: 'Поочерёдные выступления',
    [GamePhase.DAY_DISCUSSION]: 'Свободное обсуждение',
    [GamePhase.VOTING]: 'Проголосуйте за подозреваемого',
    [GamePhase.LAST_WORD]: 'Последнее слово',
  };

  return (
    <div className="center-area">
      <p className="center-phase">{PHASE_LABELS[phase]}</p>
      {hints[phase] && <p className="center-hint">{hints[phase]}</p>}
    </div>
  );
}

function BottomBar({ isPlaying, isSeated, isReady, isHost, allReady, loading, onSetReady, onStartGame }: {
  isPlaying: boolean; isSeated: boolean; isReady: boolean; isHost: boolean;
  allReady: boolean; loading: boolean;
  onSetReady: (v: boolean) => void; onStartGame: () => void;
}) {
  return (
    <div className="bottom-bar">
      <div className="bottom-bar-actions">
        {!isPlaying && isSeated && (
          <button
            className={`btn ${isReady ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => onSetReady(!isReady)}
            disabled={loading}
          >
            {isReady ? 'Не готов' : 'Готов'}
          </button>
        )}
        {!isPlaying && isHost && allReady && (
          <button className="btn btn-primary" onClick={onStartGame} disabled={loading}>
            {loading ? 'Запуск…' : 'Начать игру'}
          </button>
        )}
      </div>
      <div className="bottom-bar-voice">
        <button className="btn-icon">🎤</button>
        <button className="btn-icon">🔊</button>
      </div>
    </div>
  );
}
