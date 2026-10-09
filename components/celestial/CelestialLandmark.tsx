import FennecMark from './FennecMark';

/** Lightweight illustration. Never intercepts a pointer or loads app data. */
export default function CelestialLandmark() {
  return <div className="celestial-landmark" aria-hidden="true"><FennecMark/><div className="celestial-landmark-stars"/></div>;
}
