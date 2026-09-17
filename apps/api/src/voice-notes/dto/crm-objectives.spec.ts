import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateVoiceNoteDto } from './create-voice-note.dto';
import { UpdateVoiceNoteDto } from './update-voice-note.dto';
import { objectiveCodesFromDto } from './crm-objectives';

describe('CRM objective list input', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true,
    transformOptions: { enableImplicitConversion: true } });

  it('decodes multipart lists and preserves JSON PATCH arrays', async () => {
    const created = await pipe.transform({ duration: '60', crmObjectiveCodes: '["visit","quote"]' }, { type: 'body', metatype: CreateVoiceNoteDto });
    const updated = await pipe.transform({ expectedRevision: 2, crmObjectiveCodes: ['visit', 'quote'] }, { type: 'body', metatype: UpdateVoiceNoteDto });
    expect(created.crmObjectiveCodes).toEqual(['visit', 'quote']);
    expect(updated.crmObjectiveCodes).toEqual(['visit', 'quote']);
  });

  it.each(['bad json', '"scalar"', '[4]', { code: 'visit' }])('rejects malformed or non-string lists: %p', async (crmObjectiveCodes) => {
    await expect(pipe.transform({ duration: 60, crmObjectiveCodes }, { type: 'body', metatype: CreateVoiceNoteDto })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('distinguishes omission, clearing, legacy input and deduplicates codes', () => {
    expect(objectiveCodesFromDto({})).toBeUndefined();
    expect(objectiveCodesFromDto({ crmObjectiveCodes: [] })).toEqual([]);
    expect(objectiveCodesFromDto({ crmObjectiveCodes: null })).toEqual([]);
    expect(objectiveCodesFromDto({ crmObjectiveCode: ' old ' })).toEqual(['old']);
    expect(objectiveCodesFromDto({ crmObjectiveCodes: [' one ', 'two', 'one'] })).toEqual(['one', 'two']);
    expect(() => objectiveCodesFromDto({ crmObjectiveCode: 'old', crmObjectiveCodes: [] })).toThrow(BadRequestException);
    expect(() => objectiveCodesFromDto({ crmObjectiveCodes: [''] })).toThrow(BadRequestException);
  });
});
