import { ArrowLeft, Database } from 'lucide-react';
import Link from 'next/link';
import { SampleLibraryPanel } from '@/components/settings/sample-library-panel';

export default function SamplesPage() {
  return (
    <main className="min-h-[100dvh] overflow-y-auto overscroll-contain bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-card/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
              <Database size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold">样本库</h1>
                <span className="hidden rounded-full border border-border bg-surface-soft px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                  资料工作台
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">沉淀可复用的脚本、话术与行业素材</p>
            </div>
          </div>
          <Link
            href="/chat"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:text-sm"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">返回</span>
            工作台
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 md:px-8 md:py-6">
        <SampleLibraryPanel />
      </div>
    </main>
  );
}
