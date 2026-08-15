import { useEffect } from 'react';
import { useStore } from '@/store';

const FONT_SIZE_CLASSES: Record<string, string> = {
  small: 'font-sm',
  medium: 'font-md',
  large: 'font-lg',
};

export function useApplyTheme() {
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove('dark', 'light');
    root.classList.add(settings.theme === 'light' ? 'light' : 'dark');

    root.classList.remove('font-sm', 'font-md', 'font-lg');
    root.classList.add(FONT_SIZE_CLASSES[settings.fontSize] || 'font-md');

    const rgb = hexToRgb(settings.accentColor);
    if (rgb) {
      root.style.setProperty('--color-primary', `${rgb.r} ${rgb.g} ${rgb.b}`);
      root.style.setProperty('--color-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  }, [settings]);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}
