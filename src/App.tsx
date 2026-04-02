import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProvider, useGame } from './context/GameContext';
import { RoomProvider } from './context/RoomContext';
import { MultiplayerGameProvider } from './context/MultiplayerGameContext';
import Home from './components/Home';
import ModeSelect from './components/ModeSelect';
import GameSetup from './components/GameSetup';
import Rules from './components/Rules';
import GamePlay from './components/GamePlay';
import Scoreboard from './components/Scoreboard';
import EndGame from './components/EndGame';
import JoinRoom from './components/JoinRoom';
import MultiplayerLobby from './components/MultiplayerLobby';
import MultiplayerPlay from './components/MultiplayerPlay';
import MultiplayerEndGame from './components/MultiplayerEndGame';
import CreateRoom from './components/CreateRoom';

function AppContent() {
  const { state } = useGame();
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  switch (state.screen) {
    case 'home':
      return <Home />;
    case 'mode-select':
      return <ModeSelect />;
    case 'setup':
      return <GameSetup />;
    case 'rules':
      return <Rules />;
    case 'play':
      return state.game ? <GamePlay /> : <Home />;
    case 'scoreboard':
      return state.game ? <Scoreboard /> : <Home />;
    case 'endgame':
      return state.game ? <EndGame /> : <Home />;
    case 'create-room':
      return <CreateRoom />;
    case 'join-room':
      return <JoinRoom />;
    case 'multiplayer-lobby':
      return <MultiplayerLobby />;
    case 'multiplayer-play':
      return <MultiplayerPlay />;
    case 'multiplayer-endgame':
      return <MultiplayerEndGame />;
    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <RoomProvider>
        <MultiplayerGameProvider>
          <AppContent />
        </MultiplayerGameProvider>
      </RoomProvider>
    </GameProvider>
  );
}
