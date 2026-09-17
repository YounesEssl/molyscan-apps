export type ChatStreamEvent = { type: 'text'; content: string } | { type: 'sources'; sources: string[] };

/** XHR progress boundaries need not coincide with SSE frames (or JSON tokens). */
export function createChatStreamParser(onEvent: (event: ChatStreamEvent) => void) {
  let pending = '';
  return (chunk: string) => {
    pending += chunk;
    const frames = pending.split(/\r?\n\r?\n/);
    pending = frames.pop() ?? '';
    for (const frame of frames) {
      const payload = frame.split(/\r?\n/).filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart()).join('\n');
      if (!payload || payload === '[DONE]') continue;
      try {
        const event: unknown = JSON.parse(payload);
        if (!event || typeof event !== 'object') continue;
        if ('type' in event && event.type === 'text' && 'content' in event && typeof event.content === 'string') {
          onEvent({ type: 'text', content: event.content });
        } else if ('type' in event && event.type === 'sources' && 'sources' in event && Array.isArray(event.sources) && event.sources.every((source) => typeof source === 'string')) {
          onEvent({ type: 'sources', sources: event.sources });
        }
      } catch { /* Ignore malformed complete frames, retaining unfinished ones. */ }
    }
  };
}
