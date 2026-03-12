import { describe, expect, it } from 'vitest';
import { toOpenAIMessages } from './openai-compatible';

describe('toOpenAIMessages', () => {
  it('maps internal ChatMessage to OpenAI-compatible message format', () => {
    const input = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ] as const;

    expect(toOpenAIMessages(input as any)).toEqual([
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ]);
  });
});
