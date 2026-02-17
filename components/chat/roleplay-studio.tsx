'use client';

import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChatSession } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useRoleplayStore } from '@/stores/roleplay-store';

export function RoleplayStudio({ session }: { session?: ChatSession }) {
  const { characters, worlds, activeCharacterId, setActiveCharacter, createCharacter, updateCharacter, activeWorldId, setActiveWorld, updateWorld, markRecentCharacter } = useRoleplayStore();
  const { createSession, selectSession, sendMessage, updateSession } = useChatStore();

  const [search, setSearch] = useState('');
  const [composerValue, setComposerValue] = useState('');

  const character = characters.find((item) => item.id === (session?.characterId || activeCharacterId));
  const activeWorld = useMemo(() => worlds.find((item) => item.id === (session?.worldId || activeWorldId)), [worlds, session?.worldId, activeWorldId]);

  const filteredCharacters = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return characters;
    return characters.filter((item) => [item.name, item.personality, item.tags.join(' ')].join(' ').toLowerCase().includes(keyword));
  }, [characters, search]);

  const startWithCharacter = (characterId: string) => {
    const sid = createSession('roleplay', undefined, undefined, { characterId, worldId: activeWorld?.id });
    selectSession(sid);
    markRecentCharacter(characterId);
  };

  const onSend = () => {
    if (!session || !composerValue.trim()) return;
    sendMessage(composerValue, session.id);
    setComposerValue('');
  };

  return (
    <div className="grid min-h-[70vh] grid-cols-1 gap-3 rounded-xl border bg-card p-3 lg:grid-cols-[260px_1fr_1.4fr]">
      <section className="chat-panel p-3">
        <div className="mb-2 flex items-center gap-2">
          <Input placeholder="搜索角色" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button onClick={() => createCharacter()}><Plus size={14} /></Button>
        </div>
        <div className="space-y-2 overflow-y-auto">
          {filteredCharacters.map((item) => (
            <button key={item.id} className={`w-full rounded border p-2 text-left text-sm ${item.id === character?.id ? 'border-primary bg-primary/10' : ''}`} onClick={() => setActiveCharacter(item.id)}>
              <p>{item.avatar} {item.name}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{item.personality}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="chat-panel p-3">
        {!character ? (
          <p className="text-sm text-muted-foreground">请先创建角色。</p>
        ) : (
          <div className="space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <Input value={character.name} onChange={(e) => updateCharacter(character.id, { name: e.target.value })} placeholder="角色名称" />
              <Input value={character.avatar} onChange={(e) => updateCharacter(character.id, { avatar: e.target.value })} placeholder="头像 emoji" />
            </div>
            <Input value={character.tags.join(',')} onChange={(e) => updateCharacter(character.id, { tags: e.target.value.split(',').map((n) => n.trim()).filter(Boolean) })} placeholder="tags, 逗号分隔" />
            <Textarea value={character.personality} onChange={(e) => updateCharacter(character.id, { personality: e.target.value })} placeholder="personality" rows={2} />
            <Textarea value={character.background} onChange={(e) => updateCharacter(character.id, { background: e.target.value })} placeholder="background" rows={2} />
            <Textarea value={character.speakingStyle} onChange={(e) => updateCharacter(character.id, { speakingStyle: e.target.value })} placeholder="speakingStyle" rows={2} />
            <Textarea value={character.scenario} onChange={(e) => updateCharacter(character.id, { scenario: e.target.value })} placeholder="scenario" rows={2} />
            <Textarea value={character.exampleDialogues} onChange={(e) => updateCharacter(character.id, { exampleDialogues: e.target.value })} placeholder="exampleDialogues" rows={2} />
            <Textarea value={character.systemPrompt} onChange={(e) => updateCharacter(character.id, { systemPrompt: e.target.value })} placeholder="systemPrompt" rows={2} />
            <select className="w-full rounded border bg-background p-2 text-sm" value={activeWorld?.id || ''} onChange={(e) => setActiveWorld(e.target.value)}>
              <option value="">选择世界观</option>
              {worlds.map((world) => <option key={world.id} value={world.id}>{world.name}</option>)}
            </select>
            {activeWorld && <Textarea value={activeWorld.prompt} onChange={(e) => updateWorld(activeWorld.id, { prompt: e.target.value })} placeholder="世界观 Prompt" rows={2} />}
            <div className="flex gap-2">
              <Button onClick={() => createCharacter()}><Plus size={14} className="mr-1" />新角色</Button>
              <Button onClick={() => startWithCharacter(character.id)}>新会话</Button>
            </div>
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
