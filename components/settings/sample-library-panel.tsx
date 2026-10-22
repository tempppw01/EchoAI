'use client';

import { type ChangeEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileText,
  Files,
  Pencil,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SampleLibraryItem } from '@/lib/types';
import { useSampleLibraryStore } from '@/stores/sample-library-store';
import { useSettingsStore } from '@/stores/settings-store';

const MAX_SAMPLE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_SAMPLE_CHARS = 200_000;
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const textareaClassName =
  'w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60';

type FilterKey = 'all' | 'text' | 'file' | 'embedded';
type NoticeTone = 'success' | 'warning' | 'error';

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'text', label: '文本' },
  { key: 'file', label: '文件' },
  { key: 'embedded', label: '已嵌入' },
];

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : dateFormatter.format(date);
};

const formatBytes = (value?: number) => {
  if (!value) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const getEmbeddingResultMessage = (item: SampleLibraryItem | undefined, hasEmbeddingModel: boolean) => {
  if (!hasEmbeddingModel) {
    return {
      tone: 'warning' as const,
      message: '样本已保存；尚未配置默认嵌入模型，将使用关键词召回。',
    };
  }

  if (item?.embeddingVector?.length) {
    return {
      tone: 'success' as const,
      message: '样本已保存并完成向量索引。',
    };
  }

  return {
    tone: 'warning' as const,
    message: '样本已保存，但嵌入未完成；召回会自动回退到关键词匹配。',
  };
};

export function SampleLibraryPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const { items, addTextSample, addFileSample, updateSample, deleteSample, ensureEmbeddingForItem } = useSampleLibraryStore();
  const embeddingModel = useSettingsStore((state) => state.settings.defaultEmbeddingModel?.trim() || '');
  const recallTopK = useSettingsStore((state) => state.settings.sampleRecallTopK);

  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [notice, setNotice] = useState<{ tone: NoticeTone; message: string } | null>(null);
  const [savingText, setSavingText] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string; textContent: string } | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(
    () => () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    },
    [],
  );

  const showNotice = (message: string, tone: NoticeTone = 'success') => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setNotice({ tone, message });
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 3200);
  };

  const stats = useMemo(
    () => ({
      total: items.length,
      text: items.filter((item) => item.sourceType === 'text').length,
      file: items.filter((item) => item.sourceType === 'file').length,
      embedded: items.filter((item) => Boolean(item.embeddingVector?.length)).length,
    }),
    [items],
  );

  const filterCounts = useMemo<Record<FilterKey, number>>(
    () => ({
      all: items.length,
      text: stats.text,
      file: stats.file,
      embedded: stats.embedded,
    }),
    [items.length, stats.embedded, stats.file, stats.text],
  );

  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase();

    return [...items]
      .filter((item) => {
        if (filter === 'text' && item.sourceType !== 'text') return false;
        if (filter === 'file' && item.sourceType !== 'file') return false;
        if (filter === 'embedded' && !item.embeddingVector?.length) return false;
        if (!query) return true;

        return [item.title, item.filename, item.summary, item.textContent, item.embeddingModel]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase().includes(query));
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [deferredSearch, filter, items]);

  const latestItem = () => useSampleLibraryStore.getState().items[0];

  const onUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SAMPLE_FILE_BYTES) {
      showNotice('文件超过 2MB 限制，请拆分后再导入。', 'error');
      event.target.value = '';
      return;
    }

    setUploadingFile(true);
    try {
      const text = await readFileAsText(file);
      if (!text.trim()) {
        showNotice('文件内容为空，未加入样本库。', 'warning');
        return;
      }

      await addFileSample({
        title: title.trim() || file.name,
        filename: file.name,
        contentType: file.type || 'text/plain',
        size: file.size,
        textContent: text,
      });

      const result = getEmbeddingResultMessage(latestItem(), Boolean(embeddingModel));
      setTitle('');
      showNotice(`文件「${file.name}」已加入样本库。${result.message}`, result.tone);
    } catch {
      showNotice('文件读取失败，请使用 txt、md、json 或 csv 文本文件。', 'error');
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const saveTextSample = async () => {
    const content = textContent.trim();
    if (!content) {
      showNotice('请先输入样本文本。', 'warning');
      textAreaRef.current?.focus();
      return;
    }
    if (content.length > MAX_TEXT_SAMPLE_CHARS) {
      showNotice('样本文本超过 20 万字符，请拆分后再保存。', 'error');
      return;
    }

    setSavingText(true);
    try {
      await addTextSample({ title, textContent: content });
      const result = getEmbeddingResultMessage(latestItem(), Boolean(embeddingModel));
      setTitle('');
      setTextContent('');
      showNotice(result.message, result.tone);
    } catch {
      showNotice('样本保存失败，请稍后重试。', 'error');
    } finally {
      setSavingText(false);
    }
  };

  const refreshEmbedding = async (id: string) => {
    if (!embeddingModel) {
      showNotice('请先在设置中心配置默认嵌入模型。', 'warning');
      return;
    }

    setRefreshingId(id);
    try {
      await ensureEmbeddingForItem(id);
      const item = useSampleLibraryStore.getState().items.find((entry) => entry.id === id);
      if (item?.embeddingVector?.length) {
        showNotice('嵌入向量已更新。', 'success');
      } else {
        showNotice('嵌入未完成，样本仍可通过关键词召回。', 'warning');
      }
    } catch {
      showNotice('嵌入刷新失败，样本内容未受影响。', 'error');
    } finally {
      setRefreshingId(null);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.textContent.trim()) {
      showNotice('样本内容不能为空。', 'warning');
      return;
    }

    setSavingEditId(editing.id);
    try {
      await updateSample(editing.id, {
        title: editing.title,
        textContent: editing.textContent,
      });
      const item = useSampleLibraryStore.getState().items.find((entry) => entry.id === editing.id);
      const result = getEmbeddingResultMessage(item, Boolean(embeddingModel));
      setEditing(null);
      showNotice(`样本已更新。${result.message}`, result.tone);
    } catch {
      showNotice('样本更新失败，请稍后重试。', 'error');
    } finally {
      setSavingEditId(null);
    }
  };

  const confirmDelete = (item: SampleLibraryItem) => {
    deleteSample(item.id);
    setPendingDeleteId(null);
    if (editing?.id === item.id) {
      setEditing(null);
    }
    showNotice(`已删除样本「${item.title}」。`, 'success');
  };

  const resetFilters = () => {
    setSearch('');
    setFilter('all');
  };

  const focusEditor = () => {
    textAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    textAreaRef.current?.focus();
  };

  const noticeMeta = {
    success: {
      className: 'border-success/30 bg-success/10 text-success',
      icon: CheckCircle2,
    },
    warning: {
      className: 'border-warning/30 bg-warning/10 text-warning',
      icon: AlertCircle,
    },
    error: {
      className: 'border-danger/30 bg-danger/10 text-danger',
      icon: AlertCircle,
    },
  } as const;
  const NoticeIcon = notice ? noticeMeta[notice.tone].icon : CheckCircle2;

  return (
    <div className="min-w-0 space-y-5">
      <section aria-label="样本库概览" className="overflow-hidden rounded-xl border border-border bg-border shadow-xs">
        <div className="grid grid-cols-2 gap-px md:grid-cols-4">
          <div className="flex min-w-0 items-center gap-3 bg-card px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">全部样本</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{stats.total}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 bg-card px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
              <FileText size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">文本样本</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{stats.text}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 bg-card px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Files size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">文件导入</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{stats.file}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 bg-card px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <Sparkles size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">已建立索引</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{stats.embedded}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.5fr)] lg:items-start">
        <section
          aria-labelledby="sample-editor-title"
          className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText size={15} />
                </span>
                <h2 id="sample-editor-title" className="text-sm font-semibold text-foreground">
                  新增样本
                </h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">保存后可立即用于关键词召回与样本检索。</p>
            </div>
            <Badge tone="neutral" className="w-fit shrink-0">
              本地资料
            </Badge>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
              <span>样本标题</span>
              <Input
                value={title}
                maxLength={120}
                placeholder="例如：高客单工业品口播范例"
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
              <span>样本内容</span>
              <textarea
                ref={textAreaRef}
                className={`${textareaClassName} min-h-36`}
                value={textContent}
                maxLength={MAX_TEXT_SAMPLE_CHARS}
                placeholder="粘贴完整脚本、话术或行业参考内容"
                onChange={(event) => setTextContent(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>支持 txt / md / json / csv，单个文件不超过 2MB</span>
            <span className="tabular-nums">{textContent.length.toLocaleString()} 字符</span>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json,text/csv"
              onChange={onUploadFile}
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              disabled={uploadingFile || savingText}
              onClick={() => fileRef.current?.click()}
            >
              {uploadingFile ? <RefreshCcw size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploadingFile ? '正在导入' : '导入文本文件'}
            </Button>
            <Button
              type="button"
              size="md"
              className="w-full sm:w-auto"
              disabled={savingText || uploadingFile || !textContent.trim()}
              onClick={() => void saveTextSample()}
            >
              {savingText ? <RefreshCcw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {savingText ? '正在保存' : '保存文本样本'}
            </Button>
          </div>
        </section>

        <aside className="grid min-w-0 gap-3">
          <section className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">索引状态</h2>
              <Badge tone={embeddingModel ? 'success' : 'warning'}>{embeddingModel ? '可用' : '未配置'}</Badge>
            </div>
            <dl className="mt-3 grid gap-3 text-xs">
              <div className="min-w-0">
                <dt className="text-muted-foreground">嵌入模型</dt>
                <dd className="mt-1 break-all font-medium text-foreground">{embeddingModel || '尚未配置'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">召回数量</dt>
                <dd className="font-medium tabular-nums text-foreground">Top {recallTopK}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">向量覆盖</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {stats.total > 0 ? Math.round((stats.embedded / stats.total) * 100) : 0}%
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-surface-soft p-4">
            <div className="flex items-start gap-2.5">
              <Database size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">存储位置</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">样本保存在当前浏览器的本地存储中。</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section aria-labelledby="sample-list-title" className="min-w-0 rounded-xl border border-border bg-card shadow-xs">
        <div className="border-b border-border/70 p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="sample-list-title" className="text-sm font-semibold text-foreground">
                  已保存样本
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {stats.total}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">搜索标题、文件名、摘要或正文内容。</p>
            </div>

            <div className="relative w-full md:max-w-xs">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                placeholder="搜索样本"
                className="h-10 pl-9 pr-9"
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="清除搜索"
                  onClick={() => setSearch('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {filters.map((option) => {
              const active = filter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={active}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                    active
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={() => setFilter(option.key)}
                >
                  {option.label}
                  <span className={`tabular-nums ${active ? 'text-primary/75' : 'text-muted-foreground/75'}`}>
                    {filterCounts[option.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 sm:p-4">
          {filteredItems.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-soft px-4 py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
                {items.length === 0 ? <FileText size={19} /> : <Search size={19} />}
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {items.length === 0 ? '样本库还是空的' : '没有匹配的样本'}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                {items.length === 0 ? '先添加一份文本或导入文件，建立可复用的资料起点。' : '调整搜索词或筛选条件后再试。'}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={items.length === 0 ? focusEditor : resetFilters}
              >
                {items.length === 0 ? '添加第一份样本' : '清除筛选'}
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredItems.map((item) => {
                const isEditing = editing?.id === item.id;
                const isEmbedded = Boolean(item.embeddingVector?.length);
                const isPendingDelete = pendingDeleteId === item.id;

                return (
                  <article
                    key={item.id}
                    className="min-w-0 rounded-xl border border-border bg-background p-3 transition-colors hover:border-border-strong sm:p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            {item.sourceType === 'file' ? <Files size={15} /> : <FileText size={15} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="min-w-0 break-words text-sm font-semibold text-foreground">
                                {isEditing ? '编辑样本' : item.title}
                              </h3>
                              <Badge tone={item.sourceType === 'file' ? 'info' : 'neutral'}>
                                {item.sourceType === 'file' ? '文件' : '文本'}
                              </Badge>
                              <Badge tone={isEmbedded ? 'success' : embeddingModel ? 'warning' : 'neutral'}>
                                {isEmbedded ? '已嵌入' : embeddingModel ? '待嵌入' : '关键词召回'}
                              </Badge>
                            </div>
                            <p className="mt-1 break-words text-[11px] leading-5 text-muted-foreground">
                              {item.sourceType === 'file' ? `${item.filename || '未命名文件'} · ` : ''}
                              更新于 {formatDate(item.updatedAt)}
                              {item.size ? ` · ${formatBytes(item.size)}` : ''}
                            </p>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="mt-3 grid gap-2.5">
                            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                              <span>标题</span>
                              <Input
                                autoFocus
                                value={editing.title}
                                maxLength={120}
                                onChange={(event) =>
                                  setEditing((previous) => (previous ? { ...previous, title: event.target.value } : previous))
                                }
                              />
                            </label>
                            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                              <span>内容</span>
                              <textarea
                                className={`${textareaClassName} min-h-36`}
                                value={editing.textContent}
                                maxLength={MAX_TEXT_SAMPLE_CHARS}
                                onChange={(event) =>
                                  setEditing((previous) =>
                                    previous ? { ...previous, textContent: event.target.value } : previous,
                                  )
                                }
                              />
                            </label>
                          </div>
                        ) : (
                          <>
                            <p className="mt-3 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/85">
                              {item.textContent}
                            </p>
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span className="tabular-nums">{item.textContent.length.toLocaleString()} 字符</span>
                              <span className="break-all">{item.embeddingModel || embeddingModel || '未配置嵌入模型'}</span>
                              {item.embeddingUpdatedAt && <span>索引 {formatDate(item.embeddingUpdatedAt)}</span>}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(null)}
                              disabled={savingEditId === item.id}
                            >
                              <X size={14} />
                              取消
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void saveEdit()}
                              disabled={savingEditId === item.id}
                            >
                              {savingEditId === item.id ? (
                                <RefreshCcw size={14} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                              保存
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`编辑样本 ${item.title}`}
                              title="编辑样本"
                              onClick={() => {
                                setEditing({ id: item.id, title: item.title, textContent: item.textContent });
                                setPendingDeleteId(null);
                              }}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`刷新嵌入 ${item.title}`}
                              title={embeddingModel ? '刷新嵌入' : '请先配置默认嵌入模型'}
                              disabled={!embeddingModel || refreshingId === item.id}
                              onClick={() => void refreshEmbedding(item.id)}
                            >
                              <RefreshCcw size={14} className={refreshingId === item.id ? 'animate-spin' : ''} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`删除样本 ${item.title}`}
                              title="删除样本"
                              onClick={() => setPendingDeleteId(item.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {isPendingDelete && (
                      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-danger/25 bg-danger/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="break-words text-xs text-danger">删除后无法恢复，确定移除「{item.title}」？</p>
                        <div className="flex shrink-0 justify-end gap-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>
                            取消
                          </Button>
                          <Button type="button" variant="danger" size="sm" onClick={() => confirmDelete(item)}>
                            确认删除
                          </Button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 left-1/2 z-[80] flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs shadow-lg sm:bottom-5 sm:left-auto sm:right-5 sm:translate-x-0 ${noticeMeta[notice.tone].className}`}
        >
          <NoticeIcon size={15} className="mt-0.5 shrink-0" />
          <p className="min-w-0 break-words leading-5">{notice.message}</p>
        </div>
      )}
    </div>
  );
}
