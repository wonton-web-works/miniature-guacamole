import { useEffect, useRef, useState } from 'react';

interface Line {
  text: string;
  prefix?: string;
  prefixColor?: string;
}

const LINES: Line[] = [
  { text: '$ /mg-build implement payment-flow' },
  { text: '', prefix: '', prefixColor: 'transparent' },
  { text: '  Classifying... MECHANICAL                 0.2s', prefix: '[EM]  ', prefixColor: '#4A7C59' },
  { text: '  Writing tests — 12 specs                  4.1s', prefix: '[DEV] ', prefixColor: '#E8E8E8' },
  { text: '  Implementing — all tests passing         18.7s', prefix: '[DEV] ', prefixColor: '#E8E8E8' },
  { text: '  Coverage 99.4% ✓  Lines 142 ✓             0.3s', prefix: '[GATE]', prefixColor: '#4A7C59' },
  { text: '  Done                                     23.3s', prefix: '[EM]  ', prefixColor: '#4A7C59' },
];

const CHAR_DELAY_MS = 30;
const LINE_PAUSE_MS = 400;
const HOLD_MS = 3000;
const RESET_PAUSE_MS = 800;

function renderLine(line: Line, visibleChars: number): React.ReactNode {
  const full = line.prefix ? line.prefix + line.text : line.text;
  const visible = full.slice(0, visibleChars);

  if (!line.prefix) {
    return <span style={{ color: '#8A9BB0' }}>{visible}</span>;
  }

  const prefixLen = line.prefix.length;

  if (visible.length <= prefixLen) {
    return <span style={{ color: line.prefixColor, fontWeight: 500 }}>{visible}</span>;
  }

  return (
    <>
      <span style={{ color: line.prefixColor, fontWeight: 500 }}>{line.prefix}</span>
      <span style={{ color: '#E8E8E8' }}>{visible.slice(prefixLen)}</span>
    </>
  );
}

function StaticTerminal() {
  return (
    <div
      style={{
        background: '#0D1117',
        borderRadius: '8px',
        border: '1px solid #1E2A38',
        padding: '24px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '14px',
        lineHeight: '1.8',
        maxWidth: '580px',
      }}
    >
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F56', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#27C93F', display: 'inline-block' }} />
      </div>
      {LINES.map((line, i) => {
        const full = line.prefix ? line.prefix + line.text : line.text;
        return (
          <div key={i} style={{ display: 'block' }}>
            {line.prefix ? (
              <>
                <span style={{ color: line.prefixColor, fontWeight: 500 }}>{line.prefix}</span>
                <span style={{ color: '#E8E8E8' }}>{line.text}</span>
              </>
            ) : (
              <span style={{ color: '#8A9BB0' }}>{full}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TerminalAnimation() {
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  // State: which lines are visible and how many chars in current line
  const [completedLines, setCompletedLines] = useState<number>(0);
  const [currentLineChars, setCurrentLineChars] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;

    function getLineLength(i: number): number {
      const l = LINES[i];
      return (l.prefix ? l.prefix.length : 0) + l.text.length;
    }

    function typeCharacter(lineIdx: number, charIdx: number) {
      if (cancelled) return;
      const lineLen = getLineLength(lineIdx);

      if (charIdx <= lineLen) {
        setCurrentLineChars(charIdx);
        timeoutRef.current = setTimeout(() => typeCharacter(lineIdx, charIdx + 1), CHAR_DELAY_MS);
      } else {
        // Line done — move to next
        setCompletedLines(lineIdx + 1);
        setCurrentLineChars(0);

        if (lineIdx + 1 < LINES.length) {
          timeoutRef.current = setTimeout(() => typeCharacter(lineIdx + 1, 0), LINE_PAUSE_MS);
        } else {
          // All lines done — hold then reset
          timeoutRef.current = setTimeout(() => {
            if (cancelled) return;
            setCompletedLines(0);
            setCurrentLineChars(0);
            timeoutRef.current = setTimeout(() => typeCharacter(0, 0), RESET_PAUSE_MS);
          }, HOLD_MS);
        }
      }
    }

    typeCharacter(0, 0);

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  if (reducedMotion) return <StaticTerminal />;

  return (
    <div
      style={{
        background: '#0D1117',
        borderRadius: '8px',
        border: '1px solid #1E2A38',
        padding: '24px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '14px',
        lineHeight: '1.8',
        maxWidth: '580px',
        minHeight: '240px',
      }}
      aria-label="Terminal showing miniature-guacamole build workflow"
      role="img"
    >
      {/* Traffic lights */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F56', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#27C93F', display: 'inline-block' }} />
      </div>

      {/* Completed lines */}
      {LINES.slice(0, completedLines).map((line, i) => {
        const full = line.prefix ? line.prefix + line.text : line.text;
        return (
          <div key={i}>
            {line.prefix ? (
              <>
                <span style={{ color: line.prefixColor, fontWeight: 500 }}>{line.prefix}</span>
                <span style={{ color: '#E8E8E8' }}>{line.text}</span>
              </>
            ) : (
              <span style={{ color: '#8A9BB0' }}>{full}</span>
            )}
          </div>
        );
      })}

      {/* Currently typing line */}
      {completedLines < LINES.length && (
        <div>
          {renderLine(LINES[completedLines], currentLineChars)}
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '1em',
              background: '#4A7C59',
              marginLeft: '1px',
              verticalAlign: 'text-bottom',
              animation: 'blink 1s step-end infinite',
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
