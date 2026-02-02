import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly modelPath: string;

  constructor(private configService: ConfigService) {
    this.modelPath = this.configService.get<string>(
      'WHISPER_MODEL_PATH',
      './models/whisper-small',
    );
  }

  async transcribe(audioBuffer: Buffer): Promise<string | null> {
    const tmpPath = join(tmpdir(), `${randomUUID()}.wav`);

    try {
      await writeFile(tmpPath, audioBuffer);

      const result = await new Promise<string>((resolve, reject) => {
        execFile(
          'whisper',
          [tmpPath, '--model', this.modelPath, '--language', 'fr', '--output_format', 'txt'],
          { timeout: 60000 },
          (error, stdout, stderr) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(stdout.trim());
          },
        );
      });

      return result || null;
    } catch (error) {
      this.logger.warn(`Whisper transcription failed: ${error}. Returning null.`);
      return null;
    } finally {
      try {
        await unlink(tmpPath);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
