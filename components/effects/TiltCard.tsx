import React, { useRef } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt rotation in degrees. */
  maxTilt?: number;
  style?: React.CSSProperties;
}

/**
 * Wraps content in a card that tilts in 3D toward the cursor and shows a
 * soft spotlight following the pointer. Mutates the DOM style directly
 * (no React state) so it stays smooth at 60fps without re-rendering.
 */
const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', maxTilt = 7, style }) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (!el) return;
      const rx = (px - 0.5) * maxTilt * 2;
      const ry = (0.5 - py) * maxTilt * 2;
      el.style.setProperty('--rx', `${rx}deg`);
      el.style.setProperty('--ry', `${ry}deg`);
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
    });
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', `0deg`);
    el.style.setProperty('--ry', `0deg`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`vm-tilt ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default TiltCard;
