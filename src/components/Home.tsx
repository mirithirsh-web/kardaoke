import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { useSound } from '../hooks/useSound';
import logoImg from '../assets/logo.png';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
] as const;

export default function Home() {
  const { t, i18n } = useTranslation();
  const { dispatch, hasSavedGame } = useGame();
  const { isMuted, toggleMute } = useSound();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const switchLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('kardaoke-lang', code);
    document.documentElement.dir = code === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
    setLangOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="h-[100dvh] relative flex flex-col items-center px-6 pt-14 pb-4 text-white overflow-hidden">
      <div dir="ltr" className="absolute top-3 right-3 z-50 flex gap-2">
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5"
          >
            <span>{currentLang.flag}</span>
            <span>{currentLang.label}</span>
            <span className="text-xs opacity-60">▾</span>
          </button>
          {langOpen && (
            <div className="absolute top-full mt-1 right-0 rounded-xl overflow-hidden min-w-[140px] shadow-2xl border border-white/15 z-[60]"
              style={{ background: 'linear-gradient(135deg, #2d1b4e 0%, #1a1033 100%)' }}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => switchLang(lang.code)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2 text-sm transition-colors hover:bg-white/10 ${
                    lang.code === i18n.language ? 'bg-white/15 font-semibold' : ''
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={toggleMute}
          className="btn-secondary text-sm px-3 py-1.5"
          title={isMuted ? t('app.soundOff') : t('app.soundOn')}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="animate-float mb-3 relative z-0">
          <img src={logoImg} alt="Kardaoke!" className="w-36 h-36 object-contain drop-shadow-2xl rounded-2xl" style={{ mixBlendMode: 'screen' }} />
        </div>

        <h1 dir="ltr" className="text-5xl font-bold mb-1 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
          Kardaoke!
        </h1>
        <p className="text-lg text-white/70 mb-8">{t('app.tagline')}</p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'mode-select' })}
            className="btn-primary text-lg"
          >
            {t('home.newGame')}
          </button>

          {hasSavedGame && (
            <button
              onClick={() => dispatch({ type: 'RESUME_GAME' })}
              className="btn-secondary"
            >
              {t('home.resumeGame')}
            </button>
          )}

          <button
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'rules' })}
            className="btn-secondary"
          >
            {t('home.howToPlay')}
          </button>
        </div>
      </div>

      <div className="pt-2 pb-1 text-center text-white/30 text-xs">
        {t('home.copyright', { year: new Date().getFullYear() })}
      </div>
    </div>
  );
}
