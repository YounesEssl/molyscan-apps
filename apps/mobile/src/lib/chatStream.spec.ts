import { createChatStreamParser } from './chatStream';

describe('SSE document replies', () => {
  it('preserves a document link and sources split at every possible boundary', () => {
    const text = '[Consulter la FT](/document/111_39)';
    const source = `data: ${JSON.stringify({ type: 'text', content: text })}\n\ndata: ${JSON.stringify({ type: 'sources', sources: ['AGL 41 NF'] })}\n\ndata: [DONE]\n\n`;
    for (let i = 0; i <= source.length; i++) {
      const events: unknown[] = [];
      const push = createChatStreamParser((event) => events.push(event));
      push(source.slice(0, i));
      push(source.slice(i));
      expect(events).toEqual([{ type: 'text', content: text }, { type: 'sources', sources: ['AGL 41 NF'] }]);
    }
  });
  it('handles CRLF frames, comments and malformed complete events', () => {
    const events: unknown[] = [];
    const push = createChatStreamParser((event) => events.push(event));
    push(': keepalive\r\n\r\ndata: broken\r\n\r\ndata: {"type":"sources","sources":[99]}\r\n\r\n');
    push('data: {"type":"text","content":"ok"}\r\n\r\n');
    expect(events).toEqual([{ type: 'text', content: 'ok' }]);
  });
});
