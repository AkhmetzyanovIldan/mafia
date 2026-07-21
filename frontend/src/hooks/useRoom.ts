import { useEffect } from 'react';
import { useRoomStore } from '../store';

export function useRoom(roomId?: string) {
  const store = useRoomStore();

  useEffect(() => {
    if (roomId) {
      // TODO: fetch room by id and subscribe to WS room state updates
    }
  }, [roomId]);

  return store;
}
