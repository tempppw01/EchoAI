'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function ProImagePanel() {
  const [keyword, setKeyword] = useState('');
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">专业绘图中心</h2>
      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm">Prompt（模板：写实/二次元/插画/LOGO/3D）</p>
          <Textarea placeholder="描述你想生成的图片" />
          <Input placeholder="负面提示词" />
          <div className="grid grid-cols-2 gap-2"><Input placeholder="尺寸 1024x1024" /><Input placeholder="生成张数 4" /></div>
        </div>
        <div className="space-y-2">
          <p className="text-sm">参考图（拖拽上传）</p>
          <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">拖拽到此处上传</div>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索生成记录" />
          <Button>生成并写入消息流</Button>
        </div>
      </div>
      <div className="rounded border p-4">
        <h3 className="mb-2 text-sm font-medium">生成记录时间线</h3>
        <p className="text-xs text-muted-foreground">支持检索、复用 prompt 与再次生成（示例占位）</p>
      </div>
    </div>
  );
}
