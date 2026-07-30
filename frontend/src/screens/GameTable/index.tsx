import { useState, useEffect, useRef } from 'react';
import type { RoomStateDto, GameStateDto, PlayerDto, GamePlayerDto, IPlayerAction } from '@mafia/shared';
import { GamePhase, PlayerStatus, ActionType, RoleName } from '@mafia/shared';
import type { Toast } from '../../store/roomStore';
import { useVoiceActivity } from '../../hooks';

const PHASE_LABELS: Record<GamePhase, string> = {
  [GamePhase.WAITING]:        'Ожидание',
  [GamePhase.PREPARING]:      'Подготовка',
  [GamePhase.NIGHT]:          'Ночь',
  [GamePhase.MORNING]:        'Утро',
  [GamePhase.DAY_SPEECH]:     'Выступления',
  [GamePhase.DAY_DISCUSSION]: 'Обсуждение',
  [GamePhase.VOTING]:         'Голосование',
  [GamePhase.RUNOFF_VOTING]:  'Переголосование',
  [GamePhase.LAST_WORD]:      'Последнее слово',
  [GamePhase.CHECK_VICTORY]:  'Проверка победы',
  [GamePhase.GAME_OVER]:      'Конец игры',
};

const ROLE_LABELS: Record<RoleName, string> = {
  [RoleName.CIVILIAN]:     'Мирный житель',
  [RoleName.MAFIA]:        'Мафия',
  [RoleName.DON]:          'Дон',
  [RoleName.DETECTIVE]:    'Детектив',
  [RoleName.COMMISSIONER]: 'Комиссар',
  [RoleName.DOCTOR]:       'Доктор',
  [RoleName.LOVER]:        'Любовница',
  [RoleName.ADVOCATE]:     'Адвокат',
  [RoleName.JOURNALIST]:   'Журналист',
  [RoleName.SERGEANT]:     'Сержант',
};

// Роли которые могут действовать ночью (не убийство)
const NIGHT_CHECK_ROLES = new Set([
  RoleName.COMMISSIONER, RoleName.DETECTIVE, RoleName.DOCTOR,
  RoleName.LOVER, RoleName.ADVOCATE, RoleName.JOURNALIST,
]);

// Роли которые убивают
const NIGHT_KILL_ROLES = new Set([RoleName.MAFIA, RoleName.DON, RoleName.SERGEANT]);

function getActionType(role: RoleName): ActionType | null {
  switch (role) {
    case RoleName.MAFIA:
    case RoleName.DON:        return ActionType.KILL;
    case RoleName.SERGEANT:   return ActionType.SHOOT;
    case RoleName.DOCTOR:     return ActionType.HEAL;
    case RoleName.COMMISSIONER:
    case RoleName.DETECTIVE:
    case RoleName.DON:
    case RoleName.ADVOCATE:
    case RoleName.JOURNALIST: return ActionType.INVESTIGATE;
    case RoleName.LOVER:      return ActionType.BLOCK;
    default:                  return null;
  }
}

interface GameTableProps {
  room: RoomStateDto;
  playerId: string;
  gameState: GameStateDto | null;
  phaseEndsAt: string | null;
  toasts: Toast[];
  loading: boolean;
  error: string | null;
  speakingPlayers: Set<string>;
  onLeave: () => void;
  onTakeSeat: (seat: number) => void;
  onLeaveSeat: () => void;
  onSetReady: (isReady: boolean) => void;
  onStartGame: () => void;
  onResetGame: () => void;
  onSubmitAction: (action: IPlayerAction) => void;
  onClearError: () => void;
  onDismissToast: (id: string) => void;
}

export function GameTable({
  room, playerId, gameState, phaseEndsAt, toasts, loading, error, speakingPlayers,
  onLeave, onTakeSeat, onLeaveSeat, onSetReady, onStartGame, onResetGame, onSubmitAction, onClearError, onDismissToast,
}: GameTableProps) {
  const me = room.players.find((p) => p.id === playerId);
  const myGamePlayer = gameState?.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const isSeated = (me?.seat ?? null) !== null;
  const isReady = me?.isReady ?? false;
  const phase = gameState?.currentPhase ?? GamePhase.WAITING;
  const isPlaying = gameState !== null;
  const seatedPlayers = room.players.filter((p) => p.seat !== null);
  const allReady = seatedPlayers.length >= 4 && seatedPlayers.every((p) => p.isReady);

  // VAD — mic enabled when game is active and phase is not NIGHT
  const vadEnabled = isPlaying && phase !== GamePhase.NIGHT;
  useVoiceActivity(room.id, vadEnabled);

  // Показываем роль при старте игры
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  useEffect(() => {
    if (phase === GamePhase.PREPARING && myGamePlayer?.role) {
      setShowRoleReveal(true);
    }
  }, [phase, myGamePlayer?.role]);

  // Отслеживаем убитых ночью: сравниваем статусы при входе в MORNING
  const prevPlayersRef = useRef<GamePlayerDto[]>([]);
  const [nightDeaths, setNightDeaths] = useState<GamePlayerDto[]>([]);
  useEffect(() => {
    if (phase === GamePhase.MORNING && gameState) {
      const prev = prevPlayersRef.current;
      if (prev.length > 0) {
        const dead = gameState.players.filter((p) => {
          const was = prev.find((pp) => pp.id === p.id);
          return was?.status === PlayerStatus.ALIVE && p.status === PlayerStatus.DEAD;
        });
        setNightDeaths(dead);
      }
    } else {
      setNightDeaths([]);
    }
    if (gameState) prevPlayersRef.current = gameState.players;
  }, [phase, gameState]);

  // Выбывший после голосования (для LAST_WORD)
  const [eliminatedPlayer, setEliminatedPlayer] = useState<GamePlayerDto | null>(null);
  useEffect(() => {
    if (phase === GamePhase.LAST_WORD && gameState) {
      const prev = prevPlayersRef.current;
      const justDead = gameState.players.find((p) => {
        const was = prev.find((pp) => pp.id === p.id);
        return was?.status === PlayerStatus.ALIVE && p.status === PlayerStatus.DEAD;
      });
      setEliminatedPlayer(justDead ?? null);
    } else {
      setEliminatedPlayer(null);
    }
  }, [phase, gameState]);

  return (
    <div className="table-screen">
      <TopBar phase={phase} roomCode={room.code} isPlaying={isPlaying} phaseEndsAt={phaseEndsAt} onLeave={onLeave} />

      {error && (
        <div className="error-banner table-error">
          <span>{error}</span>
          <button onClick={onClearError}>✕</button>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className="toast" onClick={() => onDismissToast(t.id)}>
              {t.message}
            </div>
          ))}
        </div>
      )}

      {showRoleReveal && myGamePlayer?.role && (
        <RoleReveal
          role={myGamePlayer.role.name}
          onClose={() => setShowRoleReveal(false)}
        />
      )}

      <div className="table-body">
        <SeatingArea
          room={room}
          playerId={playerId}
          gameState={gameState}
          isPlaying={isPlaying}
          speakingPlayers={speakingPlayers}
          onTakeSeat={onTakeSeat}
          onLeaveSeat={onLeaveSeat}
        />
        <CenterArea
          phase={phase}
          gameState={gameState}
          room={room}
          playerId={playerId}
          myGamePlayer={myGamePlayer}
          nightDeaths={nightDeaths}
          eliminatedPlayer={eliminatedPlayer}
          isHost={isHost}
          onResetGame={onResetGame}
          onSubmitAction={onSubmitAction}
        />
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

// ── Role Reveal ───────────────────────────────────────────────────────────────

function RoleReveal({ role, onClose }: { role: RoleName; onClose: () => void }) {
  const isMafia = role === RoleName.MAFIA || role === RoleName.DON || role === RoleName.ADVOCATE;
  return (
    <div className="role-reveal-overlay" onClick={onClose}>
      <div className="role-reveal-card" onClick={(e) => e.stopPropagation()}>
        <p className="role-reveal-title">Ваша роль</p>
        <p className={`role-reveal-name ${isMafia ? 'role-mafia' : 'role-town'}`}>
          {ROLE_LABELS[role]}
        </p>
        <p className="role-reveal-hint">Нажмите чтобы закрыть</p>
        <button className="btn btn-primary" onClick={onClose}>Понятно</button>
      </div>
    </div>
  );
}

// ── Top Bar ───────────────────────────────────────────────────────────────────

function TopBar({ phase, roomCode, isPlaying, phaseEndsAt, onLeave }: {
  phase: GamePhase; roomCode: string; isPlaying: boolean;
  phaseEndsAt: string | null; onLeave: () => void;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!phaseEndsAt) { setRemaining(null); return; }
    const update = () => {
      const diff = Math.max(0, new Date(phaseEndsAt).getTime() - Date.now());
      setRemaining(Math.ceil(diff / 1000));
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  return (
    <div className="top-bar">
      <span className="room-code-label">{roomCode}</span>
      <div className="top-bar-center">
        {isPlaying && (
          <span className={`phase-badge phase-${phase.toLowerCase()}`}>{PHASE_LABELS[phase]}</span>
        )}
        {remaining !== null && remaining > 0 && (
          <span className="phase-timer">{remaining}с</span>
        )}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onLeave}>Выйти</button>
    </div>
  );
}

// ── Seating Area ──────────────────────────────────────────────────────────────

function SeatingArea({ room, playerId, gameState, isPlaying, speakingPlayers, onTakeSeat, onLeaveSeat }: {
  room: RoomStateDto; playerId: string; gameState: GameStateDto | null;
  isPlaying: boolean; speakingPlayers: Set<string>; onTakeSeat: (seat: number) => void; onLeaveSeat: () => void;
}) {
  const seats = Array.from({ length: room.maxPlayers }, (_, i) => i + 1);
  const half = Math.ceil(seats.length / 2);

  const getPlayer = (seat: number): PlayerDto | undefined =>
    room.players.find((p) => p.seat === seat);
  const getGamePlayer = (seat: number): GamePlayerDto | undefined => {
    const p = getPlayer(seat);
    return p && gameState ? gameState.players.find((gp) => gp.id === p.id) : undefined;
  };

  return (
    <div className="seating-area">
      <div className="seats-column">
        {seats.slice(0, half).map((seat) => (
          <Seat key={seat} seat={seat} player={getPlayer(seat)} gamePlayer={getGamePlayer(seat)}
            playerId={playerId} isPlaying={isPlaying} isSpeaking={speakingPlayers.has(getPlayer(seat)?.id ?? '')} onTakeSeat={onTakeSeat} onLeaveSeat={onLeaveSeat} />
        ))}
      </div>
      <div className="seats-column">
        {seats.slice(half).map((seat) => (
          <Seat key={seat} seat={seat} player={getPlayer(seat)} gamePlayer={getGamePlayer(seat)}
            playerId={playerId} isPlaying={isPlaying} isSpeaking={speakingPlayers.has(getPlayer(seat)?.id ?? '')} onTakeSeat={onTakeSeat} onLeaveSeat={onLeaveSeat} />
        ))}
      </div>
    </div>
  );
}

// ── Seat ──────────────────────────────────────────────────────────────────────

function Seat({ seat, player, gamePlayer, playerId, isPlaying, isSpeaking, onTakeSeat, onLeaveSeat }: {
  seat: number; player: PlayerDto | undefined; gamePlayer: GamePlayerDto | undefined;
  playerId: string; isPlaying: boolean; isSpeaking: boolean;
  onTakeSeat: (seat: number) => void; onLeaveSeat: () => void;
}) {
  const isEmpty = !player;
  const isMe = player?.id === playerId;
  const isDead = gamePlayer?.status === PlayerStatus.DEAD;

  let cls = 'seat';
  if (isEmpty) cls += ' seat-empty';
  else if (isDead) cls += ' seat-dead';
  else if (isMe) cls += ' seat-me';
  else cls += ' seat-occupied';
  if (isSpeaking && !isEmpty && !isDead) cls += ' seat-speaking';

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
            {isMe && gamePlayer?.role && (
              <span className="seat-role">{ROLE_LABELS[gamePlayer.role.name]}</span>
            )}
          </div>
          {isMe && !isPlaying && (
            <button
              className="seat-leave-btn"
              onClick={(e) => { e.stopPropagation(); onLeaveSeat(); }}
              title="Встать"
            >✕</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Center Area ───────────────────────────────────────────────────────────────

function CenterArea({ phase, gameState, room, playerId, myGamePlayer, nightDeaths, eliminatedPlayer, isHost, onResetGame, onSubmitAction }: {
  phase: GamePhase; gameState: GameStateDto | null; room: RoomStateDto;
  playerId: string; myGamePlayer: GamePlayerDto | undefined;
  nightDeaths: GamePlayerDto[];
  eliminatedPlayer: GamePlayerDto | null;
  isHost: boolean;
  onResetGame: () => void;
  onSubmitAction: (action: IPlayerAction) => void;
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
              <span className="role-name">{p.role ? ROLE_LABELS[p.role.name] : '—'}</span>
            </div>
          ))}
        </div>
        {isHost && (
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={onResetGame}>
            Новая игра
          </button>
        )}
      </div>
    );
  }

  const isAlive = myGamePlayer?.status === PlayerStatus.ALIVE;
  const myRole = myGamePlayer?.role?.name;

  // Утро — результаты ночи
  if (phase === GamePhase.MORNING) {
    return (
      <div className="center-area morning-panel">
        {nightDeaths.length === 0 ? (
          <>
            <p className="morning-icon">🌅</p>
            <p className="center-phase">Спокойная ночь</p>
            <p className="center-hint">Никто не погиб</p>
          </>
        ) : (
          <>
            <p className="morning-icon">💀</p>
            <p className="center-phase">Ночью погибли:</p>
            <div className="death-list">
              {nightDeaths.map((p) => (
                <div key={p.id} className="death-item">
                  <span className="death-name">{p.username}</span>
                  {p.role && <span className="death-role">{ROLE_LABELS[p.role.name]}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Последнее слово
  if (phase === GamePhase.LAST_WORD) {
    const isEliminated = eliminatedPlayer?.id === playerId;
    return (
      <div className="center-area last-word-panel">
        {isEliminated ? (
          <>
            <p className="last-word-title">Ваше последнее слово</p>
            <p className="center-hint">Вы выбыли голосованием. Скажите что хотите.</p>
          </>
        ) : (
          <>
            <p className="center-phase">Последнее слово</p>
            {eliminatedPlayer && (
              <p className="last-word-speaker">Говорит: <strong>{eliminatedPlayer.username}</strong></p>
            )}
            <p className="center-hint">Слушайте внимательно</p>
          </>
        )}
      </div>
    );
  }

  // Ночные действия
  if (phase === GamePhase.NIGHT && isAlive && myRole) {
    const canAct = NIGHT_CHECK_ROLES.has(myRole) || NIGHT_KILL_ROLES.has(myRole);
    if (canAct) {
      return (
        <NightActionPanel
          gameState={gameState}
          playerId={playerId}
          myRole={myRole}
          onSubmitAction={onSubmitAction}
        />
      );
    }
  }

  // Голосование / переголосование
  if ((phase === GamePhase.VOTING || phase === GamePhase.RUNOFF_VOTING) && isAlive) {
    return (
      <VotingPanel
        gameState={gameState}
        playerId={playerId}
        isRunoff={phase === GamePhase.RUNOFF_VOTING}
        onSubmitAction={onSubmitAction}
      />
    );
  }

  const hints: Partial<Record<GamePhase, string>> = {
    [GamePhase.NIGHT]:          'Город засыпает…',
    [GamePhase.DAY_SPEECH]:     'Поочерёдные выступления',
    [GamePhase.DAY_DISCUSSION]: 'Свободное обсуждение',
    [GamePhase.PREPARING]:      'Раздача ролей…',
    [GamePhase.CHECK_VICTORY]:  'Подведение итогов…',
  };

  return (
    <div className="center-area">
      <p className="center-phase">{PHASE_LABELS[phase]}</p>
      {hints[phase] && <p className="center-hint">{hints[phase]}</p>}
    </div>
  );
}

// ── Night Action Panel ────────────────────────────────────────────────────────

function NightActionPanel({ gameState, playerId, myRole, onSubmitAction }: {
  gameState: GameStateDto; playerId: string; myRole: RoleName;
  onSubmitAction: (action: IPlayerAction) => void;
}) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const alivePlayers = gameState.players.filter(
    (p) => p.status === PlayerStatus.ALIVE && p.id !== playerId
  );

  const actionType = getActionType(myRole);

  const actionLabels: Partial<Record<ActionType, string>> = {
    [ActionType.KILL]:        'Убить',
    [ActionType.HEAL]:        'Вылечить',
    [ActionType.INVESTIGATE]: 'Проверить',
    [ActionType.BLOCK]:       'Заблокировать',
    [ActionType.SHOOT]:       'Застрелить',
  };

  const handleConfirm = () => {
    if (!selectedTarget || !actionType || confirmed) return;
    onSubmitAction({ playerId, type: actionType, targetId: selectedTarget });
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <div className="center-area">
        <p className="center-phase">✓ Действие принято</p>
        <p className="center-hint">Ожидание остальных игроков…</p>
      </div>
    );
  }

  return (
    <div className="center-area action-panel">
      <p className="action-title">
        {actionType ? actionLabels[actionType] : 'Выберите цель'}
      </p>
      <div className="target-list">
        {alivePlayers.map((p) => (
          <button
            key={p.id}
            className={`target-btn ${selectedTarget === p.id ? 'target-selected' : ''}`}
            onClick={() => setSelectedTarget(p.id)}
          >
            {p.username}
          </button>
        ))}
      </div>
      <div className="action-buttons">
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={!selectedTarget}
        >
          Подтвердить
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setConfirmed(true)}
        >
          Пропустить
        </button>
      </div>
    </div>
  );
}

// ── Voting Panel ──────────────────────────────────────────────────────────────

function VotingPanel({ gameState, playerId, isRunoff, onSubmitAction }: {
  gameState: GameStateDto; playerId: string; isRunoff: boolean;
  onSubmitAction: (action: IPlayerAction) => void;
}) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const alivePlayers = gameState.players.filter(
    (p) => p.status === PlayerStatus.ALIVE && p.id !== playerId
  );

  const handleConfirm = () => {
    if (!selectedTarget || confirmed) return;
    onSubmitAction({ playerId, type: ActionType.VOTE, targetId: selectedTarget });
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <div className="center-area">
        <p className="center-phase">✓ Голос принят</p>
        <p className="center-hint">Ожидание остальных игроков…</p>
      </div>
    );
  }

  return (
    <div className="center-area action-panel">
      <p className="action-title">{isRunoff ? '🔄 Переголосование' : 'Голосование'}</p>
      <div className="target-list">
        {alivePlayers.map((p) => (
          <button
            key={p.id}
            className={`target-btn ${selectedTarget === p.id ? 'target-selected' : ''}`}
            onClick={() => setSelectedTarget(p.id)}
          >
            {p.username}
          </button>
        ))}
      </div>
      <div className="action-buttons">
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={!selectedTarget}
        >
          Проголосовать
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setConfirmed(true)}
        >
          Воздержаться
        </button>
      </div>
    </div>
  );
}

// ── Bottom Bar ────────────────────────────────────────────────────────────────

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
