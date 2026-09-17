import { BadRequestException } from '@nestjs/common';

/** Multipart fields arrive as JSON strings; JSON PATCH already contains an array. */
export function decodeObjectiveCodes(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}

/** Undefined preserves the previous selection; null/[] explicitly clears it. */
export function objectiveCodesFromDto(dto: {
  crmObjectiveCodes?: string[] | null;
  crmObjectiveCode?: string | null;
}): string[] | undefined {
  if (dto.crmObjectiveCodes !== undefined && dto.crmObjectiveCode !== undefined) {
    throw new BadRequestException('Provide crmObjectiveCodes or the legacy crmObjectiveCode, not both');
  }
  if (dto.crmObjectiveCodes !== undefined) {
    if (dto.crmObjectiveCodes === null) return [];
    if (!Array.isArray(dto.crmObjectiveCodes) || dto.crmObjectiveCodes.length > 50 ||
      dto.crmObjectiveCodes.some((code) => typeof code !== 'string' || !code.trim() || code.length > 255)) {
      throw new BadRequestException('CRM objectives must be a list of non-empty codes');
    }
    return [...new Set(dto.crmObjectiveCodes.map((code) => code.trim()))];
  }
  if (dto.crmObjectiveCode !== undefined) return dto.crmObjectiveCode?.trim() ? [dto.crmObjectiveCode.trim()] : [];
  return undefined;
}
