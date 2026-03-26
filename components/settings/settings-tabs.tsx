import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Loader2, RefreshCcw } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { SampleLibraryPanel } from '@/components/settings/sample-library-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchModelCatalog } from '@/lib/model-service';
import { SettingsFormValues } from '@/components/settings/settings-form-schema';

interface SettingsTabsProps {
  form: UseFormReturn<SettingsFormValues>;
  onPersistSettings: (settings: Partial<SettingsFormValues>) => void;
  onShowNotice: (message: string) => void;
}

const tabs = [
  { value: 'model', label: '模型设置' },
  { value: 'samples', label: '示范样本库' },
  { value: 'webdav', label: 'WebDAV' },
] as const;

export function SettingsTabs({ form, onPersistSettings, onShowNotice }: SettingsTabsProps) {
  const [loading, setLoading] = useState(false);
  const modelCatalog = form.watch('modelCatalog') || [];

  const pullModels = async () => {
    setLoading(true);
    try {
      const values = form.getValues();
      const models = await fetchModelCatalog();
      form.setValue('modelCatalog', models, { shouldDirty: true });

      const fallback = models[0] || '';
      if (models.length > 0) {
        if (!models.includes(values.defaultTextModel)) {
          form.setValue('defaultTextModel', fallback, { shouldDirty: true });
        }
        if (!models.includes(values.defaultImageModel)) {
          form.setValue('defaultImageModel', fallback, { shouldDirty: true });
        }
      }

      onPersistSettings({
        modelCatalog: models,
        defaultTextModel: form.getValues('defaultTextModel'),
        defaultImageModel: form.getValues('defaultImageModel'),
      });
      onShowNotice(`模型列表已更新（${models.length} 个）`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '拉取失败，请检查服务端 OPENAI_API_KEY / OPENAI_BASE_URL 配置';
      onShowNotice(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs.Root defaultValue="model">
      <Tabs.List className="mb-3 flex flex-wrap gap-2 text-xs">
        {tabs.map((tab) => (
          <Tabs.Trigger key={tab.value} value={tab.value} className="rounded border px-2 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="model" className="space-y-3 text-sm">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">当前已启用服务端代理模式</p>
          <p className="mt-1">模型列表、对话请求和嵌入请求都会通过服务端 API 路由转发，浏览器不会持久化 API Key。</p>
          <p className="mt-1">如需修改渠道地址或密钥，请在服务端环境变量中配置 <code>OPENAI_BASE_URL</code> 与 <code>OPENAI_API_KEY</code>。</p>
        </div>
        <Button type="button" className="w-full" onClick={pullModels} disabled={loading}>
          {loading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <RefreshCcw size={14} className="mr-2" />}
          拉取模型列表
        </Button>
        <div className="rounded-lg border bg-muted/20 p-2 text-xs text-muted-foreground">
          <p>已持久化模型：{modelCatalog.length}</p>
          <p className="mt-1 max-h-20 overflow-y-auto break-all">{modelCatalog.length ? modelCatalog.join('、') : '暂无，请点击“拉取模型列表”'}</p>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
            默认文本模型
            <select
              className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm text-foreground"
              value={form.watch('defaultTextModel')}
              onChange={(event) => {
                form.setValue('defaultTextModel', event.target.value, { shouldDirty: true });
                onPersistSettings({ defaultTextModel: event.target.value });
              }}
              disabled={modelCatalog.length === 0}
            >
              {modelCatalog.length === 0 ? <option value="">请先拉取模型列表</option> : modelCatalog.map((model) => <option key={`text-${model}`} value={model}>{model}</option>)}
            </select>
          </label>

          <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
            默认绘图模型
            <select
              className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm text-foreground"
              value={form.watch('defaultImageModel')}
              onChange={(event) => {
                form.setValue('defaultImageModel', event.target.value, { shouldDirty: true });
                onPersistSettings({ defaultImageModel: event.target.value });
              }}
              disabled={modelCatalog.length === 0}
            >
              {modelCatalog.length === 0 ? <option value="">请先拉取模型列表</option> : modelCatalog.map((model) => <option key={`image-${model}`} value={model}>{model}</option>)}
            </select>
          </label>

          <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
            默认嵌入模型
            <select
              className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm text-foreground"
              value={form.watch('defaultEmbeddingModel') || ''}
              onChange={(event) => {
                form.setValue('defaultEmbeddingModel', event.target.value, { shouldDirty: true });
                onPersistSettings({ defaultEmbeddingModel: event.target.value });
              }}
              disabled={modelCatalog.length === 0}
            >
              {modelCatalog.length === 0 ? <option value="">请先拉取模型列表</option> : modelCatalog.map((model) => <option key={`embed-${model}`} value={model}>{model}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 rounded-xl border bg-background/40 p-3 text-xs text-muted-foreground">
            <span className="text-sm font-semibold text-foreground">样本召回数量 TopK</span>
            <span>控制初始召回条数，建议先少量召回，再做重排序。</span>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.watch('sampleRecallTopK')}
              onChange={(event) => {
                const value = Number(event.target.value) || 3;
                form.setValue('sampleRecallTopK', value, { shouldDirty: true });
                onPersistSettings({ sampleRecallTopK: value });
              }}
            />
          </label>

          <div className="rounded-xl border bg-background/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">重排序模型</p>
                <p className="mt-1">把召回和重排拆开配置，后面更方便做相关性优化。</p>
              </div>
              <label className="flex items-center gap-2 rounded-full border px-2 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={form.watch('rerankEnabled')}
                  onChange={(event) => {
                    form.setValue('rerankEnabled', event.target.checked, { shouldDirty: true });
                    onPersistSettings({ rerankEnabled: event.target.checked });
                  }}
                />
                启用
              </label>
            </div>

            <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span>重排序模型</span>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
                  value={form.watch('rerankModel') || ''}
                  onChange={(event) => {
                    form.setValue('rerankModel', event.target.value, { shouldDirty: true });
                    onPersistSettings({ rerankModel: event.target.value });
                  }}
                  disabled={modelCatalog.length === 0}
                >
                  {modelCatalog.length === 0 ? <option value="">请先拉取模型列表</option> : [<option key="empty" value="">未配置则跳过</option>, ...modelCatalog.map((model) => <option key={`rerank-${model}`} value={model}>{model}</option>)]}
                </select>
              </label>

              <label className="grid gap-1">
                <span>参与重排条数 TopK</span>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.watch('rerankTopK')}
                  onChange={(event) => {
                    const value = Number(event.target.value) || 3;
                    form.setValue('rerankTopK', value, { shouldDirty: true });
                    onPersistSettings({ rerankTopK: value });
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <datalist id="model-catalog">
          {modelCatalog.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
        <p className="text-xs text-muted-foreground">安全提示：浏览器不会持久化 API Key，模型调用统一走服务端代理。</p>
      </Tabs.Content>

      <Tabs.Content value="samples" className="space-y-2">
        <SampleLibraryPanel />
        <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
          当前存储方案：示范样本先保存在浏览器本地存储（localStorage），适合 MVP 验证；后续接服务端时，建议把原文件放到
          `server/data/sample-files/`，抽取后的文本与 embedding 索引放到 `server/data/sample-index/`。
        </div>
      </Tabs.Content>

      <Tabs.Content value="webdav" className="grid gap-2">
        <Input placeholder="webdav url" {...form.register('webdavUrl')} />
        <Input placeholder="用户名" {...form.register('webdavUsername')} />
        <Input type="number" {...form.register('autoSyncMinutes')} />
        <div className="flex gap-2">
          <Button type="button">测试连接</Button>
          <Button type="button">手动同步</Button>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}
