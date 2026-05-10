type AppHeaderProps = {
  score: number;
};

export function AppHeader({ score }: AppHeaderProps) {
  return (
    <section className="app-header" aria-labelledby="app-title">
      <div>
        <p className="eyebrow">Gentle wrist training game</p>
        <h1 id="app-title">StrongWrist</h1>
      </div>
      <div className="scoreboard" aria-label="Current game score">
        <span>Score</span>
        <strong>{score}</strong>
      </div>
    </section>
  );
}
