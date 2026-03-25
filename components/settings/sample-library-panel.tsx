'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { CheckCircle2, FileText, RefreshCcw, Trash2, Upload } from 'lucide-react';
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
  const { items, addTextSample, addFileSample, deleteSample, ensureEmbeddingForItem } = useSampleLibraryStore();
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

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

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-xl border bg-background/60 p-3">
        <p className="mb-2 font-medium">示范样本库</p>
        <p className="mb-3 text-xs text-muted-foreground">
          用于沉淀示范脚本、行业样本、客户话术。当前先本地存储文本内容，后续通过嵌入模型召回生成。
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          <Input placeholder="样本标题，例如：机床采购口播样本" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-2">
            <input ref={fileRef} type="file" className="hidden" accept=".txt,.md,.json,.csv" onChange={onUploadFile} />
            <Button type="button" className="bg-transparent text-foreground" onClick={() => fileRef.current?.click()}>
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
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            onClick={() => {
              if (!textContent.trim()) {
                showNotice('请先输入样本文本');
                return;
              }
              addTextSample({ title, textContent });
              setTitle('');
              setTextContent('');
              showNotice('文本样本已加入样本库');
            }}
          >
            保存文本样本
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-background/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-medium">已保存样本</p>
          <span className="text-xs text-muted-foreground">{items.length} 条</span>
        </div>
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">暂无样本，先上传一份示范文本或文件。</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
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
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                          <CheckCircle2 size={12} /> 已嵌入
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-300">
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
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="bg-transparent text-foreground"
                      onClick={() => refreshEmbedding(item.id)}
                      disabled={refreshingId === item.id}
                    >
                      <RefreshCcw size={14} className={refreshingId === item.id ? 'animate-spin' : ''} />
                    </Button>
                    <Button type="button" className="bg-transparent text-foreground" onClick={() => deleteSample(item.id)}>
                      <Trash2 size={14} />
                    </Button>
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
