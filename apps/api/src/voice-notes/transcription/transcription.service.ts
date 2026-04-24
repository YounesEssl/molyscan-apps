import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';
import { extname } from 'path';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  // Whisper hallucinates these strings on silent / near-silent audio.
  private static readonly HALLUCINATIONS = [
    'amara.org',
    'sous-titres',
    'subtitles',
    'merci d\'avoir regardé',
    'transcribed by',
    'st\' 501',
  ];

  async transcribe(audioBuffer: Buffer, originalname = 'audio.m4a'): Promise<string | null> {
    if (audioBuffer.length < 1024) {
      this.logger.warn('Audio buffer too small, skipping transcription');
      return null;
    }

    try {
      const ext = extname(originalname) || '.m4a';
      const mimeType = ext === '.m4a' ? 'audio/mp4' : `audio/${ext.slice(1)}`;

      const file = await toFile(audioBuffer, `audio${ext}`, { type: mimeType });

      const result = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'fr',
        prompt: 'Note vocale, message oral spontané.',
      });

      const text = result.text?.trim() ?? '';
      const lower = text.toLowerCase();
      const isHallucination = TranscriptionService.HALLUCINATIONS.some((h) =>
        lower.includes(h),
      );

      return isHallucination ? null : text || null;
    } catch (error) {
      this.logger.warn(`Whisper transcription failed: ${error}. Returning null.`);
      return null;
    }
  }
}
