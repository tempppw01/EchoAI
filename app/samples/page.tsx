import { ArrowLeft, Database } from 'lucide-react';
import Link from 'next/link';
import { SampleLibraryPanel } from '@/components/settings/sample-library-panel';

export default function SamplesPage() {
  return (
    <main className="min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.10),transparent_30%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--surface)))] px-4 py-5 text-foreground md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/82 p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-300">
              <Database size={20} />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">EchoAI</p>
              <h1 className="text-xl font-semibold">样本库</h1>
            </div>
          </div>
          <Link
            href="/chat"
            className="inline-flex h-9 w-fit items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
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
