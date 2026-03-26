'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SettingsTabs } from '@/components/settings/settings-tabs';
import { settingsSchema, SettingsFormValues } from '@/components/settings/settings-form-schema';
import { Button } from '@/components/ui/button';
import { AppSnapshot } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { defaultSettings, sanitizeSettingsForExport, useSettingsStore } from '@/stores/settings-store';

interface SettingsCenterProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

const chatMessageSchema = z.object({
  id: z.string().min(1).max(128),
  role: z.enum(['user', 'assistant']),
  content: z.string().max(100000),
  originalContent: z.string().max(100000).optional(),
  createdAt: z.string().min(1).max(64),
  imageUrl: z.string().max(4096).optional(),
  status: z.enum(['streaming', 'error', 'done']).optional(),
});

const preferredCandidateSchema = z.object({
  sourceMessageId: z.string().min(1).max(128),
  versionKey: z.string().min(1).max(128),
  label: z.string().min(1).max(256),
  content: z.string().max(20000),
  savedAt: z.string().min(1).max(64),
});

const trainingQuestionSchema = z.object({
  stem: z.string().min(1).max(5000),
  options: z.array(z.object({ id: z.string().min(1).max(16), text: z.string().min(1).max(1000) })).min(2).max(8),
  correctOptionId: z.string().min(1).max(16),
  explanation: z.string().max(5000),
});

const trainingRecordSchema = z.object({
  round: z.number().int().min(1).max(100000),
  stem: z.string().min(1).max(5000),
  pickedOptionId: z.string().min(1).max(16),
  correctOptionId: z.string().min(1).max(16),
  isCorrect: z.boolean(),
  explanation: z.string().max(5000),
});

const videoScriptPresetSchema = z.object({
  topic: z.string().max(500).optional(),
  productName: z.string().max(500).optional(),
  targetAudience: z.string().max(500).optional(),
  contentType: z.string().max(100).optional(),
  versionCount: z.number().int().min(1).max(20).optional(),
  coreSellingPoints: z.string().max(2000).optional(),
  toneStyle: z.string().max(500).optional(),
  platform: z.string().max(100).optional(),
  durationSec: z.number().int().min(1).max(3600).optional(),
  mustInclude: z.string().max(2000).optional(),
  avoid: z.string().max(2000).optional(),
});

const chatSessionSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(200),
  mode: z.enum(['chat', 'image', 'proImage', 'copywriting', 'videoScript', 'roleplay', 'training']),
  subtype: z.string().max(200).optional(),
  characterId: z.string().max(128).optional(),
  worldId: z.string().max(128).optional(),
  pinnedMemory: z.string().max(20000).optional(),
  memorySummary: z.string().max(10000).optional(),
  preferredCandidate: preferredCandidateSchema.optional(),
  pinned: z.boolean(),
  updatedAt: z.string().min(1).max(64),
  summary: z.string().max(1000),
  model: z.string().max(200),
  messages: z.array(chatMessageSchema).max(500),
  trainingTopic: z.string().max(500).optional(),
  trainingScore: z.number().min(0).max(100).optional(),
  trainingCurrentQuestion: trainingQuestionSchema.optional(),
  trainingRound: z.number().int().min(0).max(100000).optional(),
  trainingLastCorrectOption: z.string().max(16).optional(),
  trainingRecentRecords: z.array(trainingRecordSchema).max(100).optional(),
  videoScriptPreset: videoScriptPresetSchema.optional(),
});

const appSnapshotImportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().min(1).max(64),
  settings: settingsSchema,
  sessions: z.array(chatSessionSchema).min(1).max(100),
  activeSessionId: z.string().min(1).max(128).optional(),
});

export function SettingsCenter({ open, onOpenChange }: SettingsCenterProps) {
  const { settings, setSettings, replaceSettings } = useSettingsStore();
  const { exportSnapshot, importSnapshot } = useChatStore();
  const importRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState('');

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2400);
  };

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    form.reset(settings);
  }, [settings, form]);

  const exportData = () => {
    const snapshot = exportSnapshot(sanitizeSettingsForExport(settings));
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

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      showNotice('导入失败：文件过大，限制为 2MB');
      if (importRef.current) importRef.current.value = '';
      return;
    }

    try {
      const text = await file.text();
      const parsed = appSnapshotImportSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        showNotice('导入失败：文件结构不正确');
        return;
      }

      const normalizedSettings: AppSnapshot['settings'] = sanitizeSettingsForExport({
        ...defaultSettings,
        ...parsed.data.settings,
      } as AppSnapshot['settings']);

      const snapshot: AppSnapshot = {
        ...parsed.data,
        settings: normalizedSettings,
      };

      importSnapshot(snapshot);
      replaceSettings(snapshot.settings);
      showNotice('导入成功，敏感密钥已忽略');
      onOpenChange(false);
    } catch {
      showNotice('导入失败：无法解析 JSON');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(92vw,780px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-card p-4 md:max-h-[90vh]">
            <Dialog.Title className="mb-3 shrink-0 text-base font-semibold">设置中心</Dialog.Title>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={form.handleSubmit((data) => {
                setSettings(data);
                showNotice('保存成功');
                onOpenChange(false);
              })}
            >
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <SettingsTabs form={form} onPersistSettings={setSettings} onShowNotice={showNotice} />
              </div>
              <div className="mt-4 flex shrink-0 flex-wrap justify-between gap-2 border-t pt-3">
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

      {notice && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[70] rounded-lg border bg-card/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
          {notice}
        </div>
      )}
    </>
  );
}
