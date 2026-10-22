import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { AlertCircle, CheckCircle2, Cloud, Loader2, LockKeyhole, RefreshCcw, Server, ShieldCheck, Sparkles } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { SettingsFormValues } from '@/components/settings/settings-form-schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchModelCatalog } from '@/lib/model-service';

interface SettingsTabsProps {
  form: UseFormReturn<SettingsFormValues>;
  open: boolean;
}

const tabs = [
  { value: 'model', label: '模型设置' },
  { value: 'webdav', label: 'WebDAV' },
] as const;

type FetchStatus =
  | { type: 'idle'; message: string }
  | { type: 'loading'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

type WebdavCheckState =
  | { type: 'idle'; message: string }
  | { type: 'success'; message: string }
  | { type: 'warning'; message: string }
  | { type: 'error'; message: string };

const initialWebdavCheck: WebdavCheckState = {
  type: 'idle',
  message: '检查只会验证地址与用户名格式，不会向远端发送请求。',
};

const sectionClassName = 'rounded-xl border border-border/70 bg-background p-4 shadow-sm';
const modelStatusMeta = {
  idle: {
    className: 'border-border/70 bg-background text-muted-foreground',
    icon: Server,
  },
  loading: {
    className: 'border-warning/25 bg-warning/10 text-warning',
    icon: Loader2,
  },
  success: {
    className: 'border-success/25 bg-success/10 text-success',
    icon: CheckCircle2,
  },
  error: {
    className: 'border-danger/25 bg-danger/10 text-danger',
    icon: AlertCircle,
  },
} as const;

const providers = [
  { value: 'OpenAI Compatible', label: 'OpenAI Compatible' },
  { value: 'OpenAI', label: 'OpenAI' },
];

export function SettingsTabs({ form, open }: SettingsTabsProps) {
  const [loading, setLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState<FetchStatus>({ type: 'idle', message: '打开设置时会自动尝试拉取模型列表' });
  const [webdavCheck, setWebdavCheck] = useState<WebdavCheckState>(initialWebdavCheck);
  const wasOpenRef = useRef(false);

  const modelCatalog = form.watch('modelCatalog') || [];
  const defaultTextModel = form.watch('defaultTextModel') || '';
  const defaultImageModel = form.watch('defaultImageModel') || '';
  const defaultEmbeddingModel = form.watch('defaultEmbeddingModel') || '';
  const rerankModel = form.watch('rerankModel') || '';
  const rerankEnabled = form.watch('rerankEnabled');
  const apiKey = form.watch('apiKey') || '';
  const webdavUrl = form.watch('webdavUrl') || '';
  const webdavUsername = form.watch('webdavUsername') || '';

  useEffect(() => {
    setWebdavCheck(initialWebdavCheck);
  }, [webdavUrl, webdavUsername]);

  const applyModelCatalog = useCallback(
    (models: string[]) => {
      const values = form.getValues();
      const fallback = models[0] || '';

      const nextTextModel = models.includes(values.defaultTextModel) ? values.defaultTextModel : fallback;
      const nextImageModel = models.includes(values.defaultImageModel) ? values.defaultImageModel : fallback;
      const nextEmbeddingModel =
        values.defaultEmbeddingModel && models.includes(values.defaultEmbeddingModel) ? values.defaultEmbeddingModel : fallback;
      const nextRerankModel = values.rerankModel && models.includes(values.rerankModel) ? values.rerankModel : '';

      form.setValue('modelCatalog', models, { shouldDirty: true });

      if (values.defaultTextModel !== nextTextModel) {
        form.setValue('defaultTextModel', nextTextModel, { shouldDirty: true });
      }

      if (values.defaultImageModel !== nextImageModel) {
        form.setValue('defaultImageModel', nextImageModel, { shouldDirty: true });
      }

      if ((values.defaultEmbeddingModel || '') !== nextEmbeddingModel) {
        form.setValue('defaultEmbeddingModel', nextEmbeddingModel, { shouldDirty: true });
      }

      if ((values.rerankModel || '') !== nextRerankModel) {
        form.setValue('rerankModel', nextRerankModel, { shouldDirty: true });
      }
    },
    [form],
  );

  const pullModels = useCallback(
    async (mode: 'auto' | 'manual') => {
      setLoading(true);
      setModelStatus({
        type: 'loading',
        message: mode === 'auto' ? '正在按当前配置自动拉取模型列表' : '正在重新拉取模型列表',
      });

      try {
        const values = form.getValues();
        const models = await fetchModelCatalog({
          provider: values.provider,
          apiKey: values.apiKey,
          baseUrl: values.baseUrl,
        });

        if (models.length === 0) {
          throw new Error('接口已响应，但没有返回可用模型');
        }

        applyModelCatalog(models);
        setModelStatus({
          type: 'success',
          message: `最近一次拉取成功，共获取 ${models.length} 个模型`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '拉取模型失败，请检查 API Key 或 Base URL';
        setModelStatus({
          type: 'error',
          message,
        });
      } finally {
        setLoading(false);
      }
    },
    [applyModelCatalog, form],
  );

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      void pullModels('auto');
    }

    wasOpenRef.current = open;
  }, [open, pullModels]);

  const modelStatusView = useMemo(() => {
    const meta = modelStatusMeta[modelStatus.type];
    const Icon = meta.icon;

    return (
      <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${meta.className}`}>
        <Icon size={16} className={modelStatus.type === 'loading' ? 'mt-0.5 shrink-0 animate-spin' : 'mt-0.5 shrink-0'} />
        <div className="min-w-0">
          <p className="font-medium">{modelStatus.type === 'error' ? '拉取模型失败' : modelStatus.type === 'success' ? '模型列表已更新' : '模型连接状态'}</p>
          <p className="mt-1 break-words text-xs opacity-90">{modelStatus.message}</p>
        </div>
      </div>
    );
  }, [modelStatus]);

  const checkWebdavConfig = () => {
    const values = form.getValues();
    const url = values.webdavUrl?.trim() || '';
    const username = values.webdavUsername?.trim() || '';

    if (!url) {
      setWebdavCheck({ type: 'warning', message: '请先填写 WebDAV 地址。' });
      return;
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        setWebdavCheck({ type: 'error', message: '地址必须使用 http:// 或 https:// 协议。' });
        return;
      }
    } catch {
      setWebdavCheck({ type: 'error', message: 'WebDAV 地址格式不正确，请填写完整的 URL。' });
      return;
    }

    if (!username) {
      setWebdavCheck({ type: 'warning', message: '地址格式正确，还需填写 WebDAV 用户名。' });
      return;
    }

    setWebdavCheck({
      type: 'success',
      message: '地址与用户名格式检查通过。当前版本不会向远端发起连接。',
    });
  };

  const webdavCheckMeta = {
    idle: {
      className: 'border-border/70 bg-background text-muted-foreground',
      icon: Cloud,
    },
    success: {
      className: 'border-success/25 bg-success/10 text-success',
      icon: CheckCircle2,
    },
    warning: {
      className: 'border-warning/30 bg-warning/10 text-warning',
      icon: AlertCircle,
    },
    error: {
      className: 'border-danger/25 bg-danger/10 text-danger',
      icon: AlertCircle,
    },
  } as const;
  const WebdavCheckIcon = webdavCheckMeta[webdavCheck.type].icon;

  return (
    <Tabs.Root defaultValue="model" className="min-w-0">
      <Tabs.List
        aria-label="设置分类"
        className="no-scrollbar sticky top-0 z-10 -mx-1 mb-4 flex gap-2 overflow-x-auto bg-card px-1 pb-2 pt-1 text-xs"
      >
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className="ui-segmented-trigger"
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="model" className="min-w-0 space-y-4 text-sm">
        <section className={sectionClassName}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles size={14} />
                前端优先，服务端回退
              </div>
              <h3 className="mt-3 break-words text-base font-semibold text-foreground">配置来源</h3>
              <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                这里填写的 Provider、Base URL、API Key 会本地持久化并优先生效。若 API Key 留空，聊天、嵌入和模型拉取会自动回退到服务端环境变量。
              </p>
            </div>
            <div className="w-full min-w-0 max-w-sm">{modelStatusView}</div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <label className="grid min-w-0 gap-2 text-xs text-muted-foreground">
              <span>Provider</span>
              <select
                className="ui-select h-10 rounded-xl bg-background"
                value={form.watch('provider')}
                onChange={(event) => form.setValue('provider', event.target.value, { shouldDirty: true })}
              >
                {providers.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-2 text-xs text-muted-foreground xl:col-span-2">
              <span>Base URL</span>
              <Input
                placeholder="例如：https://api.openai.com/v1"
                value={form.watch('baseUrl') || ''}
                onChange={(event) => form.setValue('baseUrl', event.target.value, { shouldDirty: true })}
              />
            </label>

            <label className="grid min-w-0 gap-2 text-xs text-muted-foreground xl:col-span-3">
              <span>API Key</span>
              <Input
                type="password"
                autoComplete="off"
                placeholder="填写后优先使用前端配置，不填写则回退服务端环境变量"
                value={apiKey}
                onChange={(event) => form.setValue('apiKey', event.target.value, { shouldDirty: true })}
              />
            </label>
          </div>
        </section>

        <section className={sectionClassName}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">模型列表</h3>
              <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">每次打开设置中心会自动尝试拉取一次模型，失败时不会清空现有模型列表。</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full md:w-auto"
              onClick={() => void pullModels('manual')}
              disabled={loading}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              拉取模型列表
            </Button>
          </div>

          <div className="mt-4 rounded-lg border border-border/70 bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">已持久化模型</p>
              <span className="rounded-full border border-border/70 px-2.5 py-1 text-xs text-muted-foreground">{modelCatalog.length} 个</span>
            </div>
            <div className="mt-3 max-h-28 overflow-y-auto whitespace-pre-wrap break-all rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs leading-5 text-muted-foreground">
              {modelCatalog.length > 0 ? modelCatalog.join('、') : '暂无模型列表，可保留当前配置后点击右侧按钮重试。'}
            </div>
          </div>
        </section>

        <section className={sectionClassName}>
          <h3 className="text-base font-semibold text-foreground">默认模型</h3>
          <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">如果自动拉取后发现当前默认模型不存在，会自动回填到列表中的第一个可用模型。</p>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <label className="grid gap-2 text-xs text-muted-foreground">
              <span>默认文本模型</span>
              <select
                className="ui-select h-10 rounded-xl bg-background"
                value={defaultTextModel}
                onChange={(event) => form.setValue('defaultTextModel', event.target.value, { shouldDirty: true })}
                disabled={modelCatalog.length === 0}
              >
                {modelCatalog.length === 0 ? (
                  <option value="">请先拉取模型列表</option>
                ) : (
                  modelCatalog.map((model) => (
                    <option key={`text-${model}`} value={model}>
                      {model}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="grid gap-2 text-xs text-muted-foreground">
              <span>默认绘图模型</span>
              <select
                className="ui-select h-10 rounded-xl bg-background"
                value={defaultImageModel}
                onChange={(event) => form.setValue('defaultImageModel', event.target.value, { shouldDirty: true })}
                disabled={modelCatalog.length === 0}
              >
                {modelCatalog.length === 0 ? (
                  <option value="">请先拉取模型列表</option>
                ) : (
                  modelCatalog.map((model) => (
                    <option key={`image-${model}`} value={model}>
                      {model}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="grid gap-2 text-xs text-muted-foreground">
              <span>默认嵌入模型</span>
              <select
                className="ui-select h-10 rounded-xl bg-background"
                value={defaultEmbeddingModel}
                onChange={(event) => form.setValue('defaultEmbeddingModel', event.target.value, { shouldDirty: true })}
                disabled={modelCatalog.length === 0}
              >
                {modelCatalog.length === 0 ? (
                  <option value="">请先拉取模型列表</option>
                ) : (
                  modelCatalog.map((model) => (
                    <option key={`embed-${model}`} value={model}>
                      {model}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
        </section>

        <section className={sectionClassName}>
          <div className="grid gap-3 xl:grid-cols-[1.1fr,1.4fr]">
            <label className="grid gap-2 rounded-lg border border-border/70 bg-background p-4 text-xs text-muted-foreground">
              <span className="text-sm font-semibold text-foreground">样本召回 TopK</span>
              <span>控制样本库初始召回数量，建议与重排阈值搭配使用，避免一次召回过多噪声内容。</span>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.watch('sampleRecallTopK')}
                onChange={(event) => form.setValue('sampleRecallTopK', Number(event.target.value) || 3, { shouldDirty: true })}
              />
            </label>

            <div className="rounded-lg border border-border/70 bg-background p-4 text-xs text-muted-foreground">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">召回重排</p>
                  <p className="mt-1">重排模型会在召回后进一步筛选结果，适合你已经有较多样本但希望结果更稳定的场景。</p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={rerankEnabled}
                    onChange={(event) => form.setValue('rerankEnabled', event.target.checked, { shouldDirty: true })}
                  />
                  启用重排
                </label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span>重排模型</span>
                  <select
                    className="ui-select h-10 rounded-xl bg-background"
                    value={rerankModel}
                    onChange={(event) => form.setValue('rerankModel', event.target.value, { shouldDirty: true })}
                    disabled={modelCatalog.length === 0}
                  >
                    {modelCatalog.length === 0 ? (
                      <option value="">请先拉取模型列表</option>
                    ) : (
                      [
                        <option key="rerank-empty" value="">
                          未配置则跳过
                        </option>,
                        ...modelCatalog.map((model) => (
                          <option key={`rerank-${model}`} value={model}>
                            {model}
                          </option>
                        )),
                      ]
                    )}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span>参与重排 TopK</span>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.watch('rerankTopK')}
                    onChange={(event) => form.setValue('rerankTopK', Number(event.target.value) || 3, { shouldDirty: true })}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>
      </Tabs.Content>

      <Tabs.Content value="webdav" className="min-w-0 space-y-4">
        <section className={sectionClassName}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">WebDAV 同步</h3>
              <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                当前版本仅保存连接配置。远端测试、凭据校验与文件同步尚未接入，相关操作会保持停用，避免出现误报成功。
              </p>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
              <LockKeyhole size={12} />
              同步器未接入
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid min-w-0 gap-2 text-xs text-muted-foreground">
              <span>WebDAV 地址</span>
              <Input
                placeholder="https://example.com/dav"
                value={webdavUrl}
                inputMode="url"
                autoComplete="url"
                onChange={(event) => form.setValue('webdavUrl', event.target.value, { shouldDirty: true })}
              />
            </label>

            <label className="grid min-w-0 gap-2 text-xs text-muted-foreground">
              <span>用户名</span>
              <Input
                placeholder="your-username"
                value={webdavUsername}
                autoComplete="username"
                onChange={(event) => form.setValue('webdavUsername', event.target.value, { shouldDirty: true })}
              />
            </label>

            <label className="grid min-w-0 gap-2 text-xs text-muted-foreground">
              <span>自动同步间隔（分钟）</span>
              <Input
                type="number"
                min={5}
                max={720}
                value={form.watch('autoSyncMinutes')}
                onChange={(event) => form.setValue('autoSyncMinutes', Number(event.target.value) || 30, { shouldDirty: true })}
              />
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-border/70 bg-surface-soft p-3">
            <div className="flex items-start gap-2.5">
              <LockKeyhole size={15} className="mt-0.5 shrink-0 text-warning" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">测试连接与手动同步暂不可用</p>
                <p id="webdav-sync-capability" className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                  当前代码没有 WebDAV 服务端适配器，也没有凭据管理，因此不会发起远端请求。下方按钮保留为功能入口，但已明确停用。
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              disabled
              aria-describedby="webdav-sync-capability"
              title="WebDAV 同步适配器尚未接入"
            >
              <Cloud size={14} />
              测试连接
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled
              aria-describedby="webdav-sync-capability"
              title="WebDAV 同步适配器尚未接入"
            >
              <RefreshCcw size={14} />
              手动同步
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
              onClick={checkWebdavConfig}
            >
              <ShieldCheck size={14} />
              检查配置格式
            </Button>
          </div>

          <div className={`mt-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs ${webdavCheckMeta[webdavCheck.type].className}`}>
            <WebdavCheckIcon
              size={14}
              className="mt-0.5 shrink-0"
            />
            <p className="min-w-0 break-words leading-5">{webdavCheck.message}</p>
          </div>
        </section>
      </Tabs.Content>
    </Tabs.Root>
  );
}
