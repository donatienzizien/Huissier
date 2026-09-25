export default function SealMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Anneaux du sceau */}
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 3.5" />

      {/* Balance de justice, dessinée au trait */}
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Pied */}
        <line x1="32" y1="24" x2="32" y2="44" />
        <line x1="26" y1="44" x2="38" y2="44" />
        {/* Fléau */}
        <line x1="20" y1="20" x2="44" y2="20" />
        <circle cx="32" cy="20" r="1.4" fill="currentColor" stroke="none" />
        {/* Bras gauche + plateau */}
        <line x1="20" y1="20" x2="20" y2="27" />
        <path d="M15 27 A5 5 0 0 0 25 27 Z" />
        {/* Bras droit + plateau */}
        <line x1="44" y1="20" x2="44" y2="27" />
        <path d="M39 27 A5 5 0 0 0 49 27 Z" />
      </g>
    </svg>
  );
}