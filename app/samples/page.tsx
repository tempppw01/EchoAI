import { ArrowLeft, Database } from 'lucide-react';
import Link from 'next/link';
import { SampleLibraryPanel } from '@/components/settings/sample-library-panel';

export default function SamplesPage() {
  return (
    <main className="min-h-screen overflow-y-auto bg-background px-4 py-5 text-foreground md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-info/10 text-info">
              <Database size={20} />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">EchoAI</p>
              <h1 className="text-xl font-semibold">样本库</h1>
            </div>
          </div>
          <Link
            href="/chat"
            className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            <ArrowLeft size={15} />
            返回内容创作
          </Link>
        </header>

        <SampleLibraryPanel />
      </div>
    </main>
  );
}