/** Animated status text for the live opportunity research request. */
export default function Loader() {
  const letters = ["L", "O", "A", "D", "I", "N", "G"];
  return (
    <div className="research-loader" role="status" aria-label="Researching real opportunities">
      <span className="sr-only">Researching real opportunities…</span>
      <div className="loader-letters" aria-hidden="true">
        {letters.map((letter, index) => (
          <span className={`loader-letter loader-letter-${index}`} key={`${letter}-${index}`}>
            {letter}
          </span>
        ))}
      </div>
      <p>Searching real organization and event pages…</p>
    </div>
  );
}
