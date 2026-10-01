'use client';

import { useId, type RefObject } from 'react';
import { WHEEL_SEGMENTS, wheelArc } from './wheelModel';
import './reward-wheel.css';

const point = (angle: number, radius: number) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [200 + Math.cos(radians) * radius, 200 + Math.sin(radians) * radius];
};

export default function RewardWheel({
  rotorRef,
  winningIndex = null,
  active = false,
}: {
  rotorRef?: RefObject<HTMLDivElement>;
  winningIndex?: number | null;
  active?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <div className="bw-wheel" data-active={active} aria-hidden="true">
      <div className="bw-wheel-aura" />
      <div className="bw-rotor" ref={rotorRef}>
        <svg viewBox="0 0 400 400" className="bw-dial">
          <defs>
            <radialGradient id={`${id}-shine`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#080919" stopOpacity=".65" />
              <stop offset="65%" stopColor="#ffffff" stopOpacity=".04" />
              <stop offset="100%" stopColor="#080919" stopOpacity=".25" />
            </radialGradient>
          </defs>
          <circle
            cx="200"
            cy="200"
            r="194"
            fill="#101222"
            stroke="#999ce3"
            strokeOpacity=".35"
          />
          {WHEEL_SEGMENTS.map((segment, index) => {
            const { start, end, middle } = wheelArc(index);
            const a = point(start, 178),
              b = point(end, 178);
            return (
              <g key={segment.key} data-segment={segment.key}>
                <path
                  d={`M200 200 L${a[0]} ${a[1]} A178 178 0 ${
                    end - start > 180 ? 1 : 0
                  } 1 ${b[0]} ${b[1]} Z`}
                  fill={segment.color}
                  stroke="#0c1026"
                  strokeOpacity=".55"
                  strokeWidth="1.5"
                />
                {winningIndex === index && (
                  <path
                    d={`M200 200 L${a[0]} ${a[1]} A178 178 0 ${
                      end - start > 180 ? 1 : 0
                    } 1 ${b[0]} ${b[1]} Z`}
                    fill="white"
                    fillOpacity=".12"
                  />
                )}
                {segment.weight >= 10 ? (
                  <g
                    transform={`rotate(${middle} 200 200)`}
                    fill="white"
                    textAnchor="middle"
                  >
                    <text
                      x="200"
                      y="75"
                      className={
                        segment.kind === 'credits'
                          ? 'bw-credit-label'
                          : 'bw-sector-label'
                      }
                    >
                      {segment.short}
                    </text>
                    <text x="200" y="91" className="bw-sector-caption">
                      {segment.kind === 'credits'
                        ? 'CRÉDITS IA'
                        : segment.kind === 'booster'
                        ? 'BOOSTER'
                        : 'UN AUTRE TOUR'}
                    </text>
                    <path
                      d="M203 112 l-10 13 h7 l-3 11 11-15 h-8z"
                      fillOpacity=".75"
                    />
                  </g>
                ) : segment.weight === 5 ? (
                  <g transform={`rotate(${middle} 200 200)`} fill="white">
                    <path d="M201 66 l-9 13 h7 l-2 11 11-15 h-8z" />
                  </g>
                ) : null}
              </g>
            );
          })}
          <circle
            cx="200"
            cy="200"
            r="178"
            fill={`url(#${id}-shine)`}
            pointerEvents="none"
          />
          <circle
            cx="200"
            cy="200"
            r="178"
            fill="none"
            stroke="white"
            strokeOpacity=".28"
          />
          {Array.from({ length: 60 }, (_, index) => {
            const [x, y] = point(index * 6, 187);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={index % 5 === 0 ? 2.2 : 1.2}
                fill={index % 5 === 0 ? '#e0ddff' : '#7d80b1'}
              />
            );
          })}
        </svg>
      </div>
      <div className="bw-hub">
        <span>S</span>
        <small>SYNAURA</small>
      </div>
      <div className="bw-pointer">
        <svg viewBox="0 0 32 42">
          <path d="M4 5 Q16 -2 28 5 L19 33 Q16 41 13 33Z" fill="#f2edff" />
          <path d="M12 6 L16 27 20 6Z" fill="#a18bfa" />
        </svg>
      </div>
    </div>
  );
}
