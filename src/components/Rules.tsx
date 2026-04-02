import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';

export default function Rules() {
  const { t } = useTranslation();
  const { dispatch } = useGame();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const sections = [
    {
      title: t('rules.objective'),
      content: t('rules.objectiveText'),
      icon: '🎯',
    },
    {
      title: t('rules.howItWorks'),
      content: [t('rules.step1'), t('rules.step2'), t('rules.step3')],
      icon: '🎤',
    },
    {
      title: t('rules.scoring'),
      content: [t('rules.scoringBackup'), t('rules.scoringMaestro'), t('rules.scoringBonus')],
      icon: '⭐',
    },
    {
      title: t('rules.inspirationCards'),
      content: t('rules.cardsExplain'),
      icon: '💡',
    },
  ];

  const advancedSections = [
    {
      title: t('rules.heldCards'),
      content: [t('rules.heldCardsText1'), t('rules.heldCardsText2'), t('rules.heldCardsText3')],
      icon: '✋',
    },
    {
      title: t('rules.cardFulfillment'),
      content: [t('rules.cardFulfillmentText1'), t('rules.cardFulfillmentText2'), t('rules.cardFulfillmentText3')],
      icon: '✅',
    },
    {
      title: t('rules.advancedDraw'),
      content: [t('rules.advancedDrawText1'), t('rules.advancedDrawText2'), t('rules.advancedDrawText3')],
      icon: '⚡',
    },
    {
      title: t('rules.cardStealing'),
      content: [t('rules.cardStealingText1'), t('rules.cardStealingText2'), t('rules.cardStealingText3'), t('rules.cardStealingText4')],
      icon: '🕵️',
    },
    {
      title: t('rules.otherRules'),
      content: [t('rules.otherRulesText1'), t('rules.otherRulesText2'), t('rules.otherRulesText3')],
      icon: '📋',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center p-6 text-white">
      <button
        onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        className="self-start mb-6 text-white/60 hover:text-white transition-colors"
      >
        ← {t('rules.back')}
      </button>

      <h2 className="text-3xl font-bold mb-8">{t('rules.title')}</h2>

      <div className="w-full max-w-md space-y-4">
        {sections.map((section, i) => (
          <div key={i} className="glass rounded-2xl p-5 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{section.icon}</span>
              <h3 className="text-xl font-semibold">{section.title}</h3>
            </div>
            {Array.isArray(section.content) ? (
              <ol className="list-decimal list-inside space-y-2 text-white/80">
                {section.content.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ol>
            ) : (
              <p className="text-white/80">{section.content}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 glass rounded-2xl p-5 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-3">{t('rules.wordBonusChart')}</h3>
        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <div key={n} className="bg-white/10 rounded-lg p-2">
              <div className="font-bold">{n}</div>
              <div className="text-yellow-400">{110 - n * 10}</div>
            </div>
          ))}
        </div>
        <p className="text-white/50 text-xs mt-2 text-center">{t('rules.wordBonusNoBonus')}</p>
      </div>

      {/* Advanced Rules toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="mt-8 w-full max-w-md glass rounded-full py-3 px-6 text-center font-semibold transition-all hover:bg-white/10"
      >
        {showAdvanced ? '▲' : '▼'} {showAdvanced ? t('rules.hideAdvanced') : t('rules.showAdvanced')}
      </button>

      {showAdvanced && (
        <div className="mt-4 w-full max-w-md space-y-4">
          <h2 className="text-2xl font-bold text-center mb-2">{t('rules.advancedRules')}</h2>
          {advancedSections.map((section, i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{section.icon}</span>
                <h3 className="text-xl font-semibold">{section.title}</h3>
              </div>
              <ul className="list-disc list-inside space-y-2 text-white/80">
                {section.content.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
