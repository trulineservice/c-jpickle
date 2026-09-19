'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin route error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 text-[#d30005] flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Unable to Load Admin Console
      </h2>
      <p className="text-sm text-[#707072] dark:text-[#8a8a93] max-w-md mb-6">
        An error occurred while preparing executive metrics and transaction logs:
        <span className="block mt-2 font-mono text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-900/50 break-words">
          {error?.message || 'Unknown administrative exception'}
        </span>
      </p>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => reset()}
          className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 h-10 px-5 text-xs font-semibold rounded-full cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-2" /> Try Again
        </Button>
        <Link href="/dashboard">
          <Button
            variant="outline"
            className="border-[#cacacb] dark:border-[#27272a] text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] h-10 px-5 text-xs font-semibold rounded-full cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
