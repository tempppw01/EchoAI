import { useEffect, useState } from 'react';
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
  const baseUrl = form.watch('baseUrl');
  const apiKey = form.watch('apiKey');
  const modelCatalog = form.watch('modelCatalog') || [];

  useEffect(() => {
    onPersistSettings({
      baseUrl: (baseUrl ?? '').trim(),
      apiKey: (apiKey ?? '').trim(),
    });
  }, [apiKey, baseUrl, onPersistSettings]);

  const pullModels = async () => {
    setLoading(true);
    try {
      const values = form.getValues();
      const normalizedBaseUrl = (values.baseUrl ?? '').trim();
      const normalizedApiKey = (values.apiKey ?? '').trim();

      onPersistSettings({
        baseUrl: normalizedBaseUrl,
        apiKey: normalizedApiKey,
      });

      const models = await fetchModelCatalog({
        ...values,
        baseUrl: normalizedBaseUrl,
        apiKey: normalizedApiKey,
      });
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
      const message = error instanceof Error ? error.message : '拉取失败，请检查渠道地址和密钥';
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

      <Tabs.Content value="model" className="space-y-2 text-sm">
        <Input
          placeholder="OpenAI 兼容 Base URL"
          {...form.register('baseUrl')}
        />
        <Input
          placeholder="API Key"
          type="password"
          autoComplete="off"
          {...form.register('apiKey', {
            onChange: () => onShowNotice('API Key 已自动保存'),
          })}
        />
        <Button type="button" className="w-full" onClick={pullModels} disabled={loading}>
          {loading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <RefreshCcw size={14} className="mr-2" />}
          拉取模型列表
        </Button>
        <div className="rounded-lg border bg-muted/20 p-2 text-xs text-muted-foreground">
          <p>已持久化模型：{modelCatalog.length}</p>
          <p className="mt-1 max-h-20 overflow-y-auto break-all">{modelCatalog.length ? modelCatalog.join('、') : '暂无，请点击“拉取模型列表”'}</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <label className="grid gap-1 text-xs text-muted-foreground">
            默认文本模型
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
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

          <label className="grid gap-1 text-xs text-muted-foreground">
            默认绘图模型
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
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

          <label className="grid gap-1 text-xs text-muted-foreground">
            默认嵌入模型
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
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

        <label className="grid gap-1 text-xs text-muted-foreground">
          样本召回数量 TopK
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
        <datalist id="model-catalog">
          {modelCatalog.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
        <p className="text-xs text-muted-foreground">安全提示：API Key 仅本地存储。</p>
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
