import { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Loader2, RefreshCcw } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
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
        <datalist id="model-catalog">
          {modelCatalog.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
        <p className="text-xs text-muted-foreground">安全提示：API Key 仅本地存储。</p>
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
