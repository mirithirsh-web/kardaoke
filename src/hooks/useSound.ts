import { useCallback, useState } from 'react';
import { soundEngine } from '../utils/sound';

type SoundName = 'cardDraw';

export function useSound() {
  const [isMuted, setIsMuted] = useState(soundEngine.muted);

  const play = useCallback((name: SoundName) => {
    soundEngine[name]();
  }, []);

  const toggleMute = useCallback(() => {
    const next = !soundEngine.muted;
    soundEngine.muted = next;
    setIsMuted(next);
  }, []);

  return { play, isMuted, toggleMute };
}
