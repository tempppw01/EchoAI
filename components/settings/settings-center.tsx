'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settings-store';

const schema = z.object({
  defaultTextModel: z.string().min(1),
  defaultImageModel: z.string().min(1),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().min(256).max(8192),
  webdavUrl: z.string().optional(),
  webdavUsername: z.string().optional(),
  autoSyncMinutes: z.coerce.number().min(5).max(720),
});

type FormValues = z.infer<typeof schema>;

export function SettingsCenter({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { settings, setSettings } = useSettingsStore();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: settings });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,780px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-4">
          <Dialog.Title className="mb-3 text-base font-semibold">设置中心</Dialog.Title>
          <form
            onSubmit={form.handleSubmit((data) => {
              setSettings(data);
              alert('保存成功 ✅');
              onOpenChange(false);
            })}
          >
            <Tabs.Root defaultValue="channel">
              <Tabs.List className="mb-3 flex flex-wrap gap-2 text-xs">
                <Tabs.Trigger value="channel" className="rounded border px-2 py-1">模型渠道</Tabs.Trigger>
                <Tabs.Trigger value="model" className="rounded border px-2 py-1">默认模型</Tabs.Trigger>
                <Tabs.Trigger value="chat" className="rounded border px-2 py-1">对话参数</Tabs.Trigger>
                <Tabs.Trigger value="webdav" className="rounded border px-2 py-1">WebDAV</Tabs.Trigger>
                <Tabs.Trigger value="exp" className="rounded border px-2 py-1">实验功能</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="channel" className="space-y-2 text-sm"><Input placeholder="API Key" /><Input placeholder="Base URL" /><Button type="button">测试连接</Button><p className="text-xs text-muted-foreground">安全提示：API Key 仅本地存储，可二次加密。</p></Tabs.Content>
              <Tabs.Content value="model" className="grid gap-2"><Input {...form.register('defaultTextModel')} /><Input {...form.register('defaultImageModel')} /></Tabs.Content>
              <Tabs.Content value="chat" className="grid gap-2 md:grid-cols-2"><Input type="number" step="0.1" {...form.register('temperature')} /><Input type="number" {...form.register('maxTokens')} /></Tabs.Content>
              <Tabs.Content value="webdav" className="grid gap-2"><Input placeholder="webdav url" {...form.register('webdavUrl')} /><Input placeholder="用户名" {...form.register('webdavUsername')} /><Input type="number" {...form.register('autoSyncMinutes')} /><div className="flex gap-2"><Button type="button">测试连接</Button><Button type="button">手动同步</Button></div><p className="text-xs">状态：待同步</p></Tabs.Content>
              <Tabs.Content value="exp"><label className="text-sm"><input type="checkbox" className="mr-2" /> 启用 MCP 灰度</label></Tabs.Content>
            </Tabs.Root>
            <div className="mt-4 flex justify-end gap-2"><Button type="button" className="bg-muted text-foreground" onClick={() => onOpenChange(false)}>取消</Button><Button type="submit">保存设置</Button></div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
