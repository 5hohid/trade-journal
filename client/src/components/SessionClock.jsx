import { SESSIONS } from '../constants.js';
import { pad } from '../utils.js';

// 24-hour IST strip showing the four sessions and where the trade time sits.
export default function SessionClock({ mins, active }) {
  const hasBoth = active.includes('London') && active.includes('New York');
  return (
    <div>
      <div className="tl">
        {SESSIONS.map((s) => (
          <div className="r" key={s.k} style={{ '--c': s.color }}>
            <em>{s.k}</em>
            <div className="trk" />
            {s.rng.map(([a, b]) => (
              <div key={a} className="seg" style={{ left: `${a / 14.4}%`, width: `${(b - a) / 14.4}%` }} />
            ))}
          </div>
        ))}
        <div className="ticks">
          {[0, 6, 12, 18, 24].map((x) => (
            <span key={x} style={{ left: `${(x / 24) * 100}%` }}>{pad(x % 24)}:00</span>
          ))}
        </div>
        <div
          className="now"
          data-t={`${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`}
          style={{ left: `calc(64px + (100% - 64px) * ${mins / 1440})` }}
        />
      </div>
      <div className="active-note">
        {active.length > 1 ? 'Overlap: ' : 'Open: '}
        {active.join(' + ')}
        {hasBoth ? ' (the strongest overlap for gold)' : ''}
      </div>
    </div>
  );
}
