import pdfParse = require('pdf-parse');

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_INDEXED_CHARACTERS = 8_000;

/** Extract only text from a verified original Sellbase technical sheet. */
export async function technicalSheetText(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`Sellbase FT unavailable (${response.status})`);
  if (Number(response.headers.get('content-length')) > MAX_PDF_BYTES) {
    throw new Error('Sellbase FT exceeds size limit');
  }
  if (!response.body) throw new Error('Sellbase FT has no body');

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_PDF_BYTES) throw new Error('Sellbase FT exceeds size limit');
      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const pdf = Buffer.concat(chunks);
  if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new Error('Sellbase FT is not a PDF');
  }
  const parsed = await pdfParse(pdf, { max: 10 });
  return cleanTechnicalSheetText(parsed.text);
}

export function cleanTechnicalSheetText(raw: string): string {
  const text = raw
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter((line) => line
      && !/^(?:MOLYDAL SA\s*-|Les renseignements contenus dans ce document|Pour de plus amples informations|Powered by TCPDF)/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length < 100) throw new Error('Sellbase FT contains too little searchable text');
  return text.slice(0, MAX_INDEXED_CHARACTERS);
}
