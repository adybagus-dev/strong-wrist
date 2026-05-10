import { useEffect, useState } from 'react';

export function usePracticeControls(enabled: boolean) {
  const [manualControl, setManualControl] = useState(0);
  const [manualLiftSignal, setManualLiftSignal] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setManualControl(0);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'ArrowUp' || event.code === 'Space') {
        event.preventDefault();
        setManualControl(1);
        if (!event.repeat) {
          setManualLiftSignal((current) => current + 1);
        }
      }

      if (event.code === 'ArrowDown') {
        event.preventDefault();
        setManualControl(-0.65);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'ArrowUp' || event.code === 'Space' || event.code === 'ArrowDown') {
        setManualControl(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled]);

  return { manualControl, manualLiftSignal };
}
