import * as Tabs from '@radix-ui/react-tabs';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsFormValues } from '@/components/settings/settings-form-schema';

interface SettingsTabsProps {
  form: UseFormReturn<SettingsFormValues>;
}

const tabs = [
  { value: 'channel', label: '模型渠道' },
  { value: 'model', label: '模型' },
  { value: 'chat', label: '参数' },
  { value: 'webdav', label: 'WebDAV' },
] as const;

export function SettingsTabs({ form }: SettingsTabsProps) {
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
        <Input placeholder="Provider" {...form.register('provider')} />
        <Input placeholder="API Key" {...form.register('apiKey')} />
        <Input placeholder="Base URL" {...form.register('baseUrl')} />
        <p className="text-xs text-muted-foreground">安全提示：API Key 仅本地存储。</p>
      </Tabs.Content>

      <Tabs.Content value="model" className="grid gap-2">
        <Input placeholder="默认文本模型" {...form.register('defaultTextModel')} />
        <Input placeholder="默认图片模型" {...form.register('defaultImageModel')} />
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
