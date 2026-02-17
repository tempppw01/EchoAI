import { useState } from 'react';
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
  { value: 'channel', label: '模型渠道' },
  { value: 'model', label: '模型' },
  { value: 'chat', label: '参数' },
  { value: 'webdav', label: 'WebDAV' },
] as const;

export function SettingsTabs({ form, onPersistSettings, onShowNotice }: SettingsTabsProps) {
  const [loading, setLoading] = useState(false);
  const modelCatalog = form.watch('modelCatalog') || [];

  const pullModels = async () => {
    setLoading(true);
    try {
      const values = form.getValues();
      const models = await fetchModelCatalog(values);
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
    <Tabs.Root defaultValue="channel">
      <Tabs.List className="mb-3 flex flex-wrap gap-2 text-xs">
        {tabs.map((tab) => (
          <Tabs.Trigger key={tab.value} value={tab.value} className="rounded border px-2 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="channel" className="space-y-2 text-sm">
        <Input
          placeholder="OpenAI 兼容 Base URL"
          {...form.register('baseUrl', {
            onBlur: (event) => onPersistSettings({ baseUrl: event.target.value }),
          })}
        />
        <Input
          placeholder="API Key"
          type="password"
          autoComplete="off"
          {...form.register('apiKey', {
            onBlur: (event) => {
              onPersistSettings({ apiKey: event.target.value });
              onShowNotice('API Key 已自动保存');
            },
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
        <p className="text-xs text-muted-foreground">安全提示：API Key 仅本地存储。</p>
      </Tabs.Content>

      <Tabs.Content value="model" className="grid gap-3 text-sm">
        <Input placeholder="默认文本模型" list="model-catalog" {...form.register('defaultTextModel')} />
        <Input placeholder="默认图片模型" list="model-catalog" {...form.register('defaultImageModel')} />
        <datalist id="model-catalog">
          {modelCatalog.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
      </Tabs.Content>

      <Tabs.Content value="chat" className="grid gap-2 md:grid-cols-2">
        <Input type="number" step="0.1" placeholder="temperature" {...form.register('temperature')} />
        <Input type="number" placeholder="max tokens" {...form.register('maxTokens')} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('stream')} /> 流式输出</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('showTokenUsage')} /> 显示 token 用量</label>
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
