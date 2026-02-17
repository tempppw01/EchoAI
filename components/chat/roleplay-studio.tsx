'use client';

import { Copy, Download, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChatSession } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useRoleplayStore } from '@/stores/roleplay-store';

export function RoleplayStudio({ session }: { session?: ChatSession }) {
  // 角色工作台：左侧挑角色，中间改设定，右侧直接对话验证效果。
  const {
    characters,
    worlds,
    activeCharacterId,
    setActiveCharacter,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    duplicateCharacter,
    importCharacter,
    exportCharacter,
    activeWorldId,
    setActiveWorld,
    createWorld,
    updateWorld,
    markRecentCharacter,
    recentCharacterId,
  } = useRoleplayStore();
  const { createSession, selectSession, sendMessage, updateSession } = useChatStore();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const [composerValue, setComposerValue] = useState('');
  const [newWorldName, setNewWorldName] = useState('');

  const character = characters.find((item) => item.id === (session?.characterId || activeCharacterId));
  const filtered = characters.filter((item) => `${item.name} ${item.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()));

  const activeWorld = useMemo(() => worlds.find((item) => item.id === (session?.worldId || activeWorldId)), [worlds, session?.worldId, activeWorldId]);

  const startWithCharacter = (characterId: string) => {
    const worldId = activeWorld?.id;
    const sid = createSession('roleplay', undefined, undefined, { characterId, worldId });
    selectSession(sid);
    markRecentCharacter(characterId);
  };

  const onExport = (characterId: string) => {
    const content = exportCharacter(characterId);
    if (!content) return;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `character-${characterId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onCreateSession = () => {
    const selectedCharacterId = character?.id || recentCharacterId || characters[0]?.id;
    if (!selectedCharacterId) return;
    startWithCharacter(selectedCharacterId);
  };

  const onSend = () => {
    if (!session || !composerValue.trim()) return;
    sendMessage(composerValue, session.id);
    setComposerValue('');
  };

  return (
    <div className="grid min-h-[70vh] grid-cols-1 gap-3 lg:grid-cols-[260px_1fr_1.4fr]">
      <section className="chat-panel p-3">
        <div className="mb-2 flex items-center gap-2">
          <Input placeholder="搜索角色" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button onClick={() => createCharacter()}><Plus size={14} /></Button>
        </div>
        <div className="space-y-2 overflow-y-auto">
          {filtered.map((item) => (
            <button key={item.id} className={`w-full rounded border p-2 text-left text-sm ${item.id === character?.id ? 'border-primary bg-primary/10' : ''}`} onClick={() => setActiveCharacter(item.id)}>
              <p>{item.avatar} {item.name}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{item.personality}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="chat-panel p-3">
        {!character ? <p className="text-sm text-muted-foreground">请先创建角色。</p> : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input value={character.name} onChange={(e) => updateCharacter(character.id, { name: e.target.value })} />
              <Input className="max-w-20" value={character.avatar} onChange={(e) => updateCharacter(character.id, { avatar: e.target.value })} />
            </div>
            <Input value={character.tags.join(',')} onChange={(e) => updateCharacter(character.id, { tags: e.target.value.split(',').map((n) => n.trim()).filter(Boolean) })} placeholder="tags, 逗号分隔" />
            <Textarea value={character.personality} onChange={(e) => updateCharacter(character.id, { personality: e.target.value })} placeholder="personality" rows={2} />
            <Textarea value={character.background} onChange={(e) => updateCharacter(character.id, { background: e.target.value })} placeholder="background" rows={2} />
            <Textarea value={character.speakingStyle} onChange={(e) => updateCharacter(character.id, { speakingStyle: e.target.value })} placeholder="speakingStyle" rows={2} />
            <Textarea value={character.scenario} onChange={(e) => updateCharacter(character.id, { scenario: e.target.value })} placeholder="scenario" rows={2} />
            <Textarea value={character.exampleDialogues} onChange={(e) => updateCharacter(character.id, { exampleDialogues: e.target.value })} placeholder="exampleDialogues" rows={2} />
            <Textarea value={character.systemPrompt} onChange={(e) => updateCharacter(character.id, { systemPrompt: e.target.value })} placeholder="systemPrompt" rows={2} />

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => duplicateCharacter(character.id)}><Copy size={14} className="mr-1" />复制</Button>
              <Button onClick={() => deleteCharacter(character.id)} className="bg-red-500 hover:bg-red-500/90"><Trash2 size={14} className="mr-1" />删除</Button>
              <Button onClick={() => onExport(character.id)}><Download size={14} className="mr-1" />导出 JSON</Button>
              <Button onClick={() => fileRef.current?.click()}><Upload size={14} className="mr-1" />导入 JSON</Button>
            </div>
            <input
              ref={fileRef}
              className="hidden"
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const result = importCharacter(text);
                alert(result.message);
                e.currentTarget.value = '';
              }}
            />

            <div className="rounded border p-2 text-xs">
              <p className="font-medium">世界观绑定</p>
              <select className="mt-1 w-full rounded border bg-background p-1" value={activeWorld?.id} onChange={(e) => setActiveWorld(e.target.value)}>
                {worlds.map((world) => <option key={world.id} value={world.id}>{world.name}</option>)}
              </select>
              {activeWorld && <Textarea className="mt-1" rows={2} value={activeWorld.prompt} onChange={(e) => updateWorld(activeWorld.id, { prompt: e.target.value })} />}
              <div className="mt-1 flex gap-1">
                <Input value={newWorldName} onChange={(e) => setNewWorldName(e.target.value)} placeholder="新世界观名" />
                <Button onClick={() => { const id = createWorld(newWorldName || '新世界', ''); setActiveWorld(id); setNewWorldName(''); }}><Save size={14} /></Button>
              </div>
            </div>

            <Button className="w-full" onClick={onCreateSession}>开始 RP（默认最近使用角色）</Button>
          </div>
        )}
      </section>

      <section className="chat-panel flex min-h-0 flex-col p-3">
        <div className="mb-2 rounded border p-2 text-xs text-muted-foreground">
          <p>固定记忆（Pin Memory）</p>
          <Textarea rows={3} value={session?.pinnedMemory || ''} onChange={(e) => session && updateSession(session.id, { pinnedMemory: e.target.value })} placeholder="手动输入长期记忆" />
          <p className="mt-1">摘要记忆</p>
          <div className="rounded bg-muted p-2">{session?.memorySummary || '暂无，消息超过阈值后自动生成。'}</div>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {session?.messages.map((msg) => (
            <div key={msg.id} className={`p-3 text-sm ${msg.role === 'user' ? 'chat-bubble-user ml-auto max-w-[85%]' : 'chat-bubble-assistant mr-auto max-w-[92%]'}`}>
              <p className="text-xs text-muted-foreground">{msg.role}</p>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-end gap-2">
          <Textarea value={composerValue} onChange={(e) => setComposerValue(e.target.value)} rows={3} placeholder="输入消息，Ctrl/Cmd+Enter 发送" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSend(); }} />
          <Button onClick={onSend}>发送</Button>
        </div>
      </section>
    </div>
  );
}
