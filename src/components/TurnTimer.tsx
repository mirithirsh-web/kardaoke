interface TurnTimerProps {
  secondsLeft: number;
}

export default function TurnTimer({ secondsLeft }: TurnTimerProps) {
  if (secondsLeft <= 0) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = minutes > 0
    ? `${minutes}:${secs.toString().padStart(2, '0')}`
    : `${secs}`;

  const isUrgent = secondsLeft <= 10;
  const isWarning = secondsLeft <= 30 && !isUrgent;

  const colorClass = isUrgent
    ? 'text-red-400'
    : isWarning
      ? 'text-yellow-400'
      : 'text-white/80';

  return (
    <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${colorClass} ${isUrgent ? 'animate-pulse' : ''}`}>
      <span>⏳</span>
      <span>{display}</span>
    </div>
  );
}
