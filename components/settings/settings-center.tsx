'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, Upload } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { SettingsTabs } from '@/components/settings/settings-tabs';
import { settingsSchema, SettingsFormValues } from '@/components/settings/settings-form-schema';
import { Button } from '@/components/ui/button';
import { AppSnapshot } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';

interface SettingsCenterProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SettingsCenter({ open, onOpenChange }: SettingsCenterProps) {
  const { settings, setSettings, replaceSettings } = useSettingsStore();
  const { exportSnapshot, importSnapshot } = useChatStore();
  const importRef = useRef<HTMLInputElement>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    form.reset(settings);
  }, [settings, form]);

  const exportData = () => {
    const snapshot = exportSnapshot(settings);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echoai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text) as AppSnapshot;
      if (!snapshot.sessions || !snapshot.settings) {
        alert('导入失败：文件格式不正确');
        return;
      }
      importSnapshot(snapshot);
      replaceSettings(snapshot.settings);
      alert('导入成功 ✅');
      onOpenChange(false);
    } catch {
      alert('导入失败：无法解析 JSON');
    }
  };

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
            <SettingsTabs form={form} />
            <div className="mt-4 flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <Button type="button" className="bg-transparent text-foreground" onClick={exportData}>
                  <Download size={14} className="mr-1" /> 导出 JSON
                </Button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => handleImport(e.target.files?.[0])}
                />
                <Button type="button" className="bg-transparent text-foreground" onClick={() => importRef.current?.click()}>
                  <Upload size={14} className="mr-1" /> 导入 JSON
                </Button>
              </div>
              <div className="flex gap-2">
                <Button type="button" className="bg-muted text-foreground" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="submit">保存设置</Button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
