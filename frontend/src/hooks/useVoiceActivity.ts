import { useEffect, useRef, useCallback, useState } from 'react';
import { GAME_EVENTS } from '@mafia/shared';
import { wsService } from '../services/WebSocketService';

const SPEAKING_THRESHOLD = 15;   // RMS amplitude 0–255
const SPEAKING_DEBOUNCE_MS = 200; // stay "speaking" this long after last detection
const POLL_INTERVAL_MS = 100;

export function useVoiceActivity(roomId: string | null, enabled: boolean) {
  const [micActive, setMicActive] = useState(false);
  const speakingRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const send = useCallback((speaking: boolean) => {
    if (!roomId) return;
    wsService.send({ event: GAME_EVENTS.VOICE_ACTIVITY, roomId, playerId: '', speaking });
  }, [roomId]);

  useEffect(() => {
    if (!enabled || !roomId) return;

    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        const ctx = new AudioContext();
        contextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        setMicActive(true);

        intervalRef.current = setInterval(() => {
          analyser.getByteTimeDomainData(data);
          // RMS
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = data[i] - 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);

          if (rms > SPEAKING_THRESHOLD) {
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            if (!speakingRef.current) {
              speakingRef.current = true;
              send(true);
            }
          } else if (speakingRef.current && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              speakingRef.current = false;
              silenceTimerRef.current = null;
              send(false);
            }, SPEAKING_DEBOUNCE_MS);
          }
        }, POLL_INTERVAL_MS);
      } catch {
        console.warn('[VAD] Microphone access denied or unavailable');
      }
    }

    start();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (speakingRef.current) { speakingRef.current = false; send(false); }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      contextRef.current?.close();
      streamRef.current = null;
      contextRef.current = null;
      setMicActive(false);
    };
  }, [enabled, roomId, send]);

  return { micActive };
}
