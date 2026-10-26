import React, { useState, useEffect } from 'react';

export function AnimatedCounter({
  value = 0,
  duration = 900,
  decimals = 1,
  prefix = '',
  suffix = '',
  className = ''
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const startValue = displayValue;
    const endValue = Number(value) || 0;

    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const current = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value, duration]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue);

  return (
    <span className={`tabular-nums font-mono ${className}`} aria-live="polite">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default AnimatedCounter;
