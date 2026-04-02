import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';

export default function ModeSelect() {
  const { t } = useTranslation();
  const { dispatch } = useGame();

  return (
    <div className="min-h-screen flex flex-col items-center p-6 text-white">
      <button
        onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        className="self-start mb-6 text-white/60 hover:text-white transition-colors"
      >
        ← {t('rules.back')}
      </button>

      <h2 className="text-2xl font-bold mb-8 text-center">
        {t('modeSelect.title')}
      </h2>

      <div className="w-full max-w-sm space-y-5">
        {/* Pass & Play */}
        <button
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'setup' })}
          className="w-full glass rounded-2xl p-6 text-start transition-transform hover:scale-[1.02] active:scale-[0.98] group"
        >
          <div className="text-4xl mb-3">📱</div>
          <h3 className="text-xl font-bold mb-2 group-hover:text-pink-300 transition-colors">
            {t('modeSelect.passAndPlay')}
          </h3>
          <p className="text-white/50 text-sm leading-relaxed">
            {t('modeSelect.passAndPlayDesc')}
          </p>
        </button>

        {/* Online Room */}
        <div className="glass rounded-2xl p-6 transition-transform hover:scale-[1.02]">
          <div className="text-4xl mb-3">🌐</div>
          <h3 className="text-xl font-bold mb-2">
            {t('modeSelect.onlineRoom')}
          </h3>
          <p className="text-white/50 text-sm leading-relaxed mb-5">
            {t('modeSelect.onlineRoomDesc')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'create-room' })}
              className="btn-primary flex-1 py-3"
            >
              {t('modeSelect.create')}
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'join-room' })}
              className="btn-secondary flex-1 py-3"
            >
              {t('modeSelect.join')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
