'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { SettingsTabs } from '@/components/settings/settings-tabs';
import { settingsSchema, SettingsFormValues } from '@/components/settings/settings-form-schema';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settings-store';

interface SettingsCenterProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SettingsCenter({ open, onOpenChange }: SettingsCenterProps) {
  const { settings, setSettings } = useSettingsStore();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

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
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" className="bg-muted text-foreground" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit">保存设置</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
