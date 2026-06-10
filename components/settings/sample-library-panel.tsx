'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { CheckCircle2, FileText, Pencil, RefreshCcw, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSampleLibraryStore } from '@/stores/sample-library-store';

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

export function SampleLibraryPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { items, addTextSample, addFileSample, updateSample, deleteSample, ensureEmbeddingForItem } = useSampleLibraryStore();
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string; textContent: string } | null>(null);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2400);
  };

  const onUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      addFileSample({
        title: title.trim() || file.name,
        filename: file.name,
        contentType: file.type || 'text/plain',
        size: file.size,
        textContent: text,
      });
      setTitle('');
      event.target.value = '';
      showNotice('文件样本已加入样本库');
    } catch {
      showNotice('文件读取失败，请换 txt / md / json 等文本文件');
    }
  };

  const refreshEmbedding = async (id: string) => {
    setRefreshingId(id);
    try {
      await ensureEmbeddingForItem(id);
      showNotice('嵌入状态已刷新');
    } finally {
      setRefreshingId(null);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.textContent.trim()) {
      showNotice('样本内容不能为空');
      return;
    }
    setSavingEditId(editing.id);
    try {
      await updateSample(editing.id, {
        title: editing.title,
        textContent: editing.textContent,
      });
      setEditing(null);
      showNotice('样本已更新');
    } finally {
      setSavingEditId(null);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-3xl border bg-card/72 p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-1">
          <p className="font-semibold">新增参考样本</p>
          <p className="text-xs text-muted-foreground">
            用来沉淀示范脚本、行业样本、客户话术。内容创作会自动从这里召回相关样本，不需要每次手动粘贴。
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input placeholder="样本标题，例如：机床采购口播样本" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-2">
            <input ref={fileRef} type="file" className="hidden" accept=".txt,.md,.json,.csv" onChange={onUploadFile} />
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload size={14} className="mr-1" /> 上传文本文件
            </Button>
          </div>
        </div>
        <textarea
          className="mt-2 min-h-32 w-full rounded-xl border bg-background px-3 py-2 text-sm"
          placeholder="直接粘贴示范样本文本，后续可用于嵌入召回。"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">支持 txt / md / json / csv，本地持久化保存。</span>
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              if (!textContent.trim()) {
                showNotice('请先输入样本文本');
                return;
              }
              await addTextSample({ title, textContent });
              setTitle('');
              setTextContent('');
              showNotice('文本样本已加入样本库');
            }}
          >
            保存文本样本
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border bg-card/72 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold">已保存样本</p>
          <span className="text-xs text-muted-foreground">{items.length} 条</span>
        </div>
        <div className="grid gap-2">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-4 text-xs text-muted-foreground">暂无样本，先上传一份示范文本或文件。</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-2xl border bg-background/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {editing?.id === item.id ? (
                      <div className="space-y-2">
                        <Input value={editing.title} onChange={(event) => setEditing((prev) => (prev ? { ...prev, title: event.target.value } : prev))} />
                        <textarea
                          className="min-h-36 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          value={editing.textContent}
                          onChange={(event) => setEditing((prev) => (prev ? { ...prev, textContent: event.target.value } : prev))}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <FileText size={14} />
                          <p className="truncate font-medium">{item.title}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.sourceType === 'file' ? `文件：${item.filename || '-'} · ` : '文本样本 · '}
                          {item.contentType}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          {item.embeddingVector?.length ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-300">
                              <CheckCircle2 size={12} /> 已嵌入
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-600 dark:text-amber-300">
                              未嵌入
                            </span>
                          )}
                          <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1 text-muted-foreground">
                            模型：{item.embeddingModel || '未生成'}
                          </span>
                          {item.embeddingUpdatedAt && (
                            <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1 text-muted-foreground">
                              更新时间：{new Date(item.embeddingUpdatedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{item.summary || '暂无摘要'}</p>
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {editing?.id === item.id ? (
                      <>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(null)}>
                          <X size={14} />
                          取消
                        </Button>
                        <Button type="button" size="sm" onClick={() => void saveEdit()} disabled={savingEditId === item.id}>
                          保存
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditing({ id: item.id, title: item.title, textContent: item.textContent })} title="编辑样本">
                          <Pencil size={14} />
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => refreshEmbedding(item.id)} disabled={refreshingId === item.id} title="刷新嵌入">
                          <RefreshCcw size={14} className={refreshingId === item.id ? 'animate-spin' : ''} />
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteSample(item.id)} title="删除样本">
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {notice && <div className="rounded-lg border bg-card/90 px-3 py-2 text-xs">{notice}</div>}
    </div>
  );
}
