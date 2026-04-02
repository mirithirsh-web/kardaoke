import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { ensureAuth, createUniqueRoomCode, roomRef, db, set, get, onValue, onDisconnect, remove, ref } from '../firebase';
import type { RoomPlayer, RoomSettings } from '../types';

interface RoomState {
  roomCode: string | null;
  myUid: string | null;
  isCreator: boolean;
  players: RoomPlayer[];
  status: 'lobby' | 'playing' | 'finished' | null;
  settings: RoomSettings | null;
  error: string | null;
  loading: boolean;
}

interface RoomContextType extends RoomState {
  createRoom: (name: string) => Promise<string>;
  joinRoom: (code: string, name: string) => Promise<void>;
  leaveRoom: () => void;
  updateSettings: (settings: Partial<RoomSettings>) => Promise<void>;
  startGame: () => Promise<void>;
  creatorUid: string | null;
}

const RoomContext = createContext<RoomContextType>({
  roomCode: null,
  myUid: null,
  isCreator: false,
  players: [],
  status: null,
  settings: null,
  error: null,
  loading: false,
  creatorUid: null,
  createRoom: async () => '',
  joinRoom: async () => {},
  leaveRoom: () => {},
  updateSettings: async () => {},
  startGame: async () => {},
});

export function RoomProvider({ children }: { children: ReactNode }) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [status, setStatus] = useState<'lobby' | 'playing' | 'finished' | null>(null);
  const [settings, setSettings] = useState<RoomSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatorUid, setCreatorUid] = useState<string | null>(null);

  // Presence heartbeat: re-establish connected status when Firebase reconnects
  useEffect(() => {
    if (!roomCode || !myUid) return;

    const connectedRef = ref(db, '.info/connected');
    const playerConnRef = roomRef(roomCode, 'players', myUid, 'connected');

    const unsub = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(playerConnRef).set(false);
        set(playerConnRef, true);
      }
    });

    return () => unsub();
  }, [roomCode, myUid]);

  // Subscribe to room changes
  useEffect(() => {
    if (!roomCode) return;

    const unsubPlayers = onValue(roomRef(roomCode, 'players'), (snap) => {
      if (!snap.exists()) { setPlayers([]); return; }
      const data = snap.val() as Record<string, { name: string; order: number; connected: boolean }>;
      const list: RoomPlayer[] = Object.entries(data)
        .map(([uid, p]) => ({ uid, name: p.name, order: p.order, connected: p.connected }))
        .sort((a, b) => a.order - b.order);
      setPlayers(list);
    });

    const unsubStatus = onValue(roomRef(roomCode, 'status'), (snap) => {
      if (snap.exists()) setStatus(snap.val());
    });

    const unsubSettings = onValue(roomRef(roomCode, 'settings'), (snap) => {
      if (snap.exists()) setSettings(snap.val());
    });

    const unsubCreator = onValue(roomRef(roomCode, 'createdBy'), (snap) => {
      if (snap.exists()) setCreatorUid(snap.val());
    });

    return () => {
      unsubPlayers();
      unsubStatus();
      unsubSettings();
      unsubCreator();
    };
  }, [roomCode]);

  const createRoom = useCallback(async (name: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const uid = await ensureAuth();
      setMyUid(uid);

      // Generate unique code
      const code = await createUniqueRoomCode();

      await set(roomRef(code), {
        createdBy: uid,
        createdAt: Date.now(),
        status: 'lobby',
        settings: { rounds: 5, includeCards: true, allowStealing: false },
        players: {
          [uid]: { name, order: 0, connected: true },
        },
      });

      // Set up disconnect handler
      const connRef = roomRef(code, 'players', uid, 'connected');
      onDisconnect(connRef).set(false);

      setRoomCode(code);
      setIsCreator(true);
      setLoading(false);
      return code;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room');
      setLoading(false);
      throw e;
    }
  }, []);

  const joinRoom = useCallback(async (code: string, name: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const uid = await ensureAuth();
      setMyUid(uid);

      const upperCode = code.toUpperCase();
      const roomSnap = await get(roomRef(upperCode));
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }
      const roomData = roomSnap.val();
      if (roomData.status !== 'lobby') {
        throw new Error('Game already in progress');
      }

      // Check if already in room (reconnecting)
      const playersData = roomData.players || {};
      const existingPlayer = playersData[uid];
      if (existingPlayer) {
        await set(roomRef(upperCode, 'players', uid, 'connected'), true);
      } else {
        const currentCount = Object.keys(playersData).length;
        const existingNames = new Set(
          Object.values(playersData).map((p: any) => (p.name as string).toLowerCase())
        );
        let finalName = name;
        if (existingNames.has(finalName.toLowerCase())) {
          let suffix = 1;
          while (existingNames.has(`${name}${suffix}`.toLowerCase())) suffix++;
          finalName = `${name}${suffix}`;
        }
        await set(roomRef(upperCode, 'players', uid), {
          name: finalName,
          order: currentCount,
          connected: true,
        });
      }

      const connRef = roomRef(upperCode, 'players', uid, 'connected');
      onDisconnect(connRef).set(false);

      setRoomCode(upperCode);
      setIsCreator(false);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join room');
      setLoading(false);
      throw e;
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (roomCode && myUid) {
      remove(roomRef(roomCode, 'players', myUid)).catch(() => {});
    }
    setRoomCode(null);
    setMyUid(null);
    setIsCreator(false);
    setPlayers([]);
    setStatus(null);
    setSettings(null);
    setError(null);
    setCreatorUid(null);
  }, [roomCode, myUid]);

  const updateSettings = useCallback(async (partial: Partial<RoomSettings>) => {
    if (!roomCode || !isCreator) return;
    const current = settings || { rounds: 5, includeCards: true, allowStealing: false };
    await set(roomRef(roomCode, 'settings'), { ...current, ...partial });
  }, [roomCode, isCreator, settings]);

  const startGame = useCallback(async () => {
    if (!roomCode || !isCreator) return;
    await set(roomRef(roomCode, 'status'), 'playing');
  }, [roomCode, isCreator]);

  return (
    <RoomContext.Provider value={{
      roomCode, myUid, isCreator, players, status, settings, error, loading, creatorUid,
      createRoom, joinRoom, leaveRoom, updateSettings, startGame,
    }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  return useContext(RoomContext);
}
