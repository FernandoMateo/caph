// Redibujo vectorial del logo CAPH Santa Fe (original PNG 100×100).
// `ground` es el color de fondo: dibuja las separaciones blancas entre formas.

type Props = {
  ground?: string;
  ink?: string;
  withText?: boolean;
  className?: string;
  title?: string;
};

export function LogoMark({ ground = "#ffffff" }: { ground?: string }) {
  return (
    <g>
      <rect x="51.3" y="1" width="38.5" height="36.5" fill="#FEC73E" />
      <circle cx="28.8" cy="19.4" r="18.1" fill="#FF4F42" />
      <polygon points="12.5,38.2 24.6,38.2 24.6,41.2 12.5,55.6" fill="#3FB3E2" />
      <polygon points="13,61.3 48.2,61.3 29.6,43.8" fill="#5BB5C1" />
      <polygon points="53.8,61.3 89.6,61.3 73.8,43.8" fill="#A1C0D4" />
      <polygon points="77.2,37.6 89.8,24 89.8,56.4" fill="#002F43" stroke={ground} strokeWidth="1.6" strokeLinejoin="miter" />
      <rect x="77.6" y="36.8" width="12.2" height="5" fill="#F9A63A" />
      <polygon
        points="37,15.8 65.4,15.8 71.4,21.8 71.4,48.8 65.4,55 37,55 31,48.8 31,21.8"
        fill="#002F43"
        stroke={ground}
        strokeWidth="2.2"
      />
      <rect x="40" y="23.6" width="11.2" height="3.2" rx="1" fill="#F9A63A" />
    </g>
  );
}

export function Logo({ ground = "#ffffff", ink = "#091135", withText = true, className, title = "CAPH Santa Fe" }: Props) {
  return (
    <svg
      className={className}
      viewBox={withText ? "10 0 82 100" : "10 0 82 63"}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <LogoMark ground={ground} />
      {withText && (
        <g fill={ink} fontFamily="var(--font-sans), sans-serif">
          <text x="51" y="86.5" textAnchor="middle" fontSize="27" fontWeight="700" textLength="77" lengthAdjust="spacingAndGlyphs">
            CAPH
          </text>
          <text x="51" y="98.2" textAnchor="middle" fontSize="8.4" fontWeight="600" letterSpacing="2.4" textLength="44">
            SANTA FE
          </text>
        </g>
      )}
    </svg>
  );
}
