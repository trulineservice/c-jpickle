'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'pill' | 'compact';
}

export function ThemeToggle({ className = '', variant = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent animate-pulse ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] ${className}`}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          aria-label="Light mode"
          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            !isDark
              ? 'bg-[#111111] text-white shadow-xs'
              : 'text-[#707072] hover:text-[#111111] dark:text-[#8a8a93] dark:hover:text-white'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          aria-label="Dark mode"
          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            isDark
              ? 'bg-white text-[#111111] shadow-xs'
              : 'text-[#707072] hover:text-[#111111] dark:text-[#8a8a93] dark:hover:text-white'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
          isDark
            ? 'bg-[#18181c] text-[#f4f4f5] border-[#27272a] hover:bg-[#222227]'
            : 'bg-[#f5f5f5] text-[#111111] border-[#e5e5e5] hover:bg-[#eaeaea]'
        } ${className}`}
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Light</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-[#111111]" />
            <span>Dark</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
        isDark
          ? 'bg-[#18181c] text-[#f4f4f5] border-[#27272a] hover:bg-[#222227] hover:border-[#3f3f46]'
          : 'bg-[#f5f5f5] text-[#111111] border-[#e5e5e5] hover:bg-[#eaeaea] hover:border-[#cacacb]'
      } ${className}`}
    >
      <Sun
        className={`w-4 h-4 text-amber-400 transition-all duration-300 ${
          isDark ? 'rotate-0 scale-100' : '-rotate-90 scale-0 absolute'
        }`}
      />
      <Moon
        className={`w-4 h-4 text-[#111111] transition-all duration-300 ${
          isDark ? 'rotate-90 scale-0 absolute' : 'rotate-0 scale-100'
        }`}
      />
    </button>
  );
}
