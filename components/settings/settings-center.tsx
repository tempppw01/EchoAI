'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Download, Loader2, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
const AUTOSAVE_DELAY_MS = 420;
const DEBOUNCED_FIELDS = new Set<keyof SettingsFormValues>([
  'provider',
  'apiKey',
  'baseUrl',
  'webdavUrl',
  'webdavUsername',
  'autoSyncMinutes',
  'sampleRecallTopK',
  'rerankTopK',
  'temperature',
  'maxTokens',
]);

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

const viralStructureReferenceSchema = z.object({
  sourceMessageId: z.string().min(1).max(128),
  sectionKey: z.string().min(1).max(128),
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
  viralStructureReference: viralStructureReferenceSchema.optional(),
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
  viralStructureReference: viralStructureReferenceSchema.optional(),
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

type SaveState = 'idle' | 'saving' | 'saved';

const saveStateMeta: Record<SaveState, { label: string; className: string; icon: typeof CheckCircle2 | typeof Loader2 }> = {
  idle: {
    label: '自动保存已开启',
    className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
    icon: CheckCircle2,
  },
  saving: {
    label: '自动保存中',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    icon: Loader2,
  },
  saved: {
    label: '已自动保存',
    className: 'border-sky-500/25 bg-sky-500/10 text-sky-200',
    icon: CheckCircle2,
  },
};

export function SettingsCenter({ open, onOpenChange }: SettingsCenterProps) {
  const { settings, setSettings, replaceSettings } = useSettingsStore();
  const { exportSnapshot, importSnapshot } = useChatStore();
  const importRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const pendingPatchRef = useRef<Partial<SettingsFormValues>>({});
  const suppressWatchRef = useRef(false);
  const wasOpenRef = useRef(false);
  const [notice, setNotice] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const resetFormValues = useCallback(
    (nextValues: SettingsFormValues) => {
      suppressWatchRef.current = true;
      form.reset(nextValues);
      window.setTimeout(() => {
        suppressWatchRef.current = false;
      }, 0);
    },
    [form],
  );

  const flushPendingPatch = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const patch = pendingPatchRef.current;
    pendingPatchRef.current = {};

    if (Object.keys(patch).length === 0) {
      return;
    }

    setSettings(patch);
    setSaveState('saved');
  }, [setSettings]);

  const persistPatch = useCallback(
    (patch: Partial<SettingsFormValues>, debounced: boolean) => {
      if (Object.keys(patch).length === 0) return;

      setSaveState('saving');

      if (debounced) {
        pendingPatchRef.current = {
          ...pendingPatchRef.current,
          ...patch,
        };

        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = window.setTimeout(() => {
          flushPendingPatch();
        }, AUTOSAVE_DELAY_MS);
        return;
      }

      setSettings(patch);
      setSaveState('saved');
    },
    [flushPendingPatch, setSettings],
  );

  useEffect(() => {
    const subscription = form.watch((values, info) => {
      const fieldName = info.name as keyof SettingsFormValues | undefined;
      if (!fieldName || suppressWatchRef.current) {
        return;
      }

      const parsed = settingsSchema.safeParse(values);
      if (!parsed.success) {
        return;
      }

      const nextValue = parsed.data[fieldName];
      persistPatch({ [fieldName]: nextValue } as Partial<SettingsFormValues>, DEBOUNCED_FIELDS.has(fieldName));
    });

    return () => subscription.unsubscribe();
  }, [form, persistPatch]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      resetFormValues(settings);
      setSaveState('idle');
    }

    if (!open) {
      flushPendingPatch();
    }

    wasOpenRef.current = open;
  }, [flushPendingPatch, open, resetFormValues, settings]);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    },
    [],
  );

  const exportData = () => {
    const snapshot = exportSnapshot(sanitizeSettingsForExport(settings));
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `echoai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showNotice('已导出设置快照，API Key 不会写入备份文件');
  };

  const handleImport = async (file?: File) => {
    if (!file) return;

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      showNotice('导入失败：文件超过 2MB 限制');
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

      const normalizedSettings = sanitizeSettingsForExport({
        ...defaultSettings,
        ...parsed.data.settings,
      });

      const snapshot: AppSnapshot = {
        ...parsed.data,
        settings: normalizedSettings,
      };

      importSnapshot(snapshot);
      replaceSettings(snapshot.settings);
      resetFormValues(snapshot.settings);
      setSaveState('saved');
      showNotice('导入成功，设置已刷新，API Key 不会从备份恢复');
    } catch {
      showNotice('导入失败：无法解析 JSON');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  const saveMeta = saveStateMeta[saveState];
  const SaveIcon = saveMeta.icon;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(94vw,880px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/98 p-5 shadow-2xl">
            <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">设置中心</Dialog.Title>
                <p className="mt-1 text-sm text-muted-foreground">当前设置会自动保存到本地，模型配置默认优先使用前端填写内容。</p>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${saveMeta.className}`}>
                <SaveIcon size={14} className={saveState === 'saving' ? 'animate-spin' : ''} />
                {saveMeta.label}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <SettingsTabs form={form} open={open} />
            </div>

            <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={exportData}>
                  <Download size={14} /> 导出 JSON
                </Button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => handleImport(event.target.files?.[0])}
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => importRef.current?.click()}>
                  <Upload size={14} /> 导入 JSON
                </Button>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {notice && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[70] rounded-2xl border border-border/70 bg-card/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
          {notice}
        </div>
      )}
    </>
  );
}
