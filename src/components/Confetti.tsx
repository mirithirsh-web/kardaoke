const colors = ['#e91e8c', '#a855f7', '#ffd700', '#5b9bd5', '#e74c5e', '#34d399'];
const pieces = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 3,
  duration: 2 + Math.random() * 3,
  color: colors[Math.floor(Math.random() * colors.length)],
  size: 6 + Math.random() * 8,
}));

export default function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
