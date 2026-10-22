export interface ImageWorkbenchDraft {
  prompt: string;
  negativePrompt: string;
  style: string;
  ratio: string;
}

export const imageStylePresets = [
  '电影感海报',
  '产品渲染',
  '编辑大片',
  '3D 等距',
  '动漫概念',
  '极简品牌',
] as const;

export const imageRatioPresets = [
  { value: '1:1', label: '方形', description: '头像与产品方图', aspectRatio: '1 / 1' },
  { value: '4:5', label: '竖版', description: '海报与信息流封面', aspectRatio: '4 / 5' },
  { value: '16:9', label: '横幅', description: '横幅与演示封面', aspectRatio: '16 / 9' },
  { value: '9:16', label: '竖屏', description: '故事与短视频', aspectRatio: '9 / 16' },
] as const;

export const defaultImageWorkbenchDraft: ImageWorkbenchDraft = {
  prompt: '',
  negativePrompt: '',
  style: imageStylePresets[0],
  ratio: imageRatioPresets[0].value,
};

export function buildImageRequest(draft: ImageWorkbenchDraft) {
  const prompt = draft.prompt.trim();
  const negativePrompt = draft.negativePrompt.trim();

  return [
    '【专业绘图请求】',
    `画面提示词：${prompt || '未填写'}`,
    `视觉风格：${draft.style}`,
    `画幅比例：${draft.ratio}`,
    `负面提示词：${negativePrompt || '无'}`,
    '',
    '请严格依据以上提示词、风格和画幅生成图片，不要遗漏负面约束。',
  ].join('\n');
}
