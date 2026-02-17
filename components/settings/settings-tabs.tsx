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
  { value: 'model', label: '默认模型' },
  { value: 'chat', label: '对话参数' },
  { value: 'webdav', label: 'WebDAV' },
  { value: 'exp', label: '实验功能' },
] as const;

/**
 * 将设置面板内容拆分为独立组件，避免 `settings-center.tsx` 持续膨胀。
 */
export function SettingsTabs({ form }: SettingsTabsProps) {
  return (
    <Tabs.Root defaultValue="channel">
      <Tabs.List className="mb-3 flex flex-wrap gap-2 text-xs">
        {tabs.map((tab) => (
          <Tabs.Trigger key={tab.value} value={tab.value} className="rounded border px-2 py-1">
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="channel" className="space-y-2 text-sm">
        <Input placeholder="API Key" />
        <Input placeholder="Base URL" />
        <Button type="button">测试连接</Button>
        <p className="text-xs text-muted-foreground">安全提示：API Key 仅本地存储，可二次加密。</p>
      </Tabs.Content>

      <Tabs.Content value="model" className="grid gap-2">
        <Input {...form.register('defaultTextModel')} />
        <Input {...form.register('defaultImageModel')} />
      </Tabs.Content>

      <Tabs.Content value="chat" className="grid gap-2 md:grid-cols-2">
        <Input type="number" step="0.1" {...form.register('temperature')} />
        <Input type="number" {...form.register('maxTokens')} />
      </Tabs.Content>

      <Tabs.Content value="webdav" className="grid gap-2">
        <Input placeholder="webdav url" {...form.register('webdavUrl')} />
        <Input placeholder="用户名" {...form.register('webdavUsername')} />
        <Input type="number" {...form.register('autoSyncMinutes')} />
        <div className="flex gap-2">
          <Button type="button">测试连接</Button>
          <Button type="button">手动同步</Button>
        </div>
        <p className="text-xs">状态：待同步</p>
      </Tabs.Content>

      <Tabs.Content value="exp">
        <label className="text-sm">
          <input type="checkbox" className="mr-2" /> 启用 MCP 灰度
        </label>
      </Tabs.Content>
    </Tabs.Root>
  );
}
