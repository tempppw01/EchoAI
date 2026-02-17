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
  const {
    characters,
    worlds,
    activeCharacterId,
    setActiveCharacter,
    createCharacter,
    updateCharacter,
    activeWorldId,
    setActiveWorld,
    updateWorld,
    markRecentCharacter,
  } = useRoleplayStore();
  const { createSession, selectSession, sendMessage, updateSession } = useChatStore();

  const [composerValue, setComposerValue] = useState('');

  const character = characters.find((item) => item.id === (session?.characterId || activeCharacterId));
  const activeWorld = useMemo(() => worlds.find((item) => item.id === (session?.worldId || activeWorldId)), [worlds, session?.worldId, activeWorldId]);

  const startWithCharacter = (characterId: string) => {
    const worldId = activeWorld?.id;
    const sid = createSession('roleplay', undefined, undefined, { characterId, worldId });
    selectSession(sid);
    markRecentCharacter(characterId);
  };

  const onSend = () => {
    if (!session || !composerValue.trim()) return;
    sendMessage(composerValue, session.id);
    setComposerValue('');
  };

  return (
    <div className="flex min-h-[70vh] flex-col rounded-xl border bg-card p-3">
      <div className="mb-3 grid gap-2 rounded-lg border bg-background/40 p-3 md:grid-cols-[1fr_1fr_auto]">
        <select
          className="w-full rounded border bg-background p-2 text-sm"
          value={character?.id || ''}
          onChange={(e) => setActiveCharacter(e.target.value)}
        >
          {characters.map((item) => <option key={item.id} value={item.id}>{item.avatar} {item.name}</option>)}
        </select>

        <select
          className="w-full rounded border bg-background p-2 text-sm"
          value={activeWorld?.id || ''}
          onChange={(e) => setActiveWorld(e.target.value)}
        >
          {worlds.map((world) => <option key={world.id} value={world.id}>{world.name}</option>)}
        </select>

        <div className="flex gap-2">
          <Button onClick={() => createCharacter()}><Plus size={14} className="mr-1" />新角色</Button>
          <Button onClick={() => character?.id && startWithCharacter(character.id)}>新会话</Button>
        </div>
      </div>

      {character && (
        <div className="mb-3 grid gap-2 rounded-lg border p-3 text-sm md:grid-cols-2">
          <Input value={character.name} onChange={(e) => updateCharacter(character.id, { name: e.target.value })} placeholder="角色名称" />
          <Input value={character.avatar} onChange={(e) => updateCharacter(character.id, { avatar: e.target.value })} placeholder="头像 emoji" />
          <Textarea className="md:col-span-2" rows={2} value={character.systemPrompt} onChange={(e) => updateCharacter(character.id, { systemPrompt: e.target.value })} placeholder="角色 System Prompt" />
          {activeWorld && <Textarea className="md:col-span-2" rows={2} value={activeWorld.prompt} onChange={(e) => updateWorld(activeWorld.id, { prompt: e.target.value })} placeholder="世界观 Prompt" />}
          <Textarea className="md:col-span-2" rows={2} value={session?.pinnedMemory || ''} onChange={(e) => session && updateSession(session.id, { pinnedMemory: e.target.value })} placeholder="固定记忆（长期记忆）" />
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border p-2">
        {session?.messages.map((msg) => (
          <div key={msg.id} className={`rounded border p-2 text-sm ${msg.role === 'user' ? 'ml-6 bg-primary/10' : 'mr-6'}`}>
            <p className="text-xs text-muted-foreground">{msg.role}</p>
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <Textarea value={composerValue} onChange={(e) => setComposerValue(e.target.value)} rows={3} placeholder="输入消息，Ctrl/Cmd+Enter 发送" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSend(); }} />
        <Button onClick={onSend}>发送</Button>
      </div>
    </div>
  );
}
