import * as cheerio from 'cheerio';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as projectKnowledgeRepo from '../repositories/project-knowledge-repository';

const MAX_TEXT_LENGTH = 120_000;

export interface IngestResult {
  success: boolean;
  title: string;
  entriesCreated: number;
  error?: string;
}

/** Extract text from a PDF buffer. Uses dynamic import because pdf-parse is CJS. */
async function extractPdf(buffer: Buffer): Promise<string> {
  const mod = await import('pdf-parse');
  const fn = (mod as { default?: (buf: Buffer) => Promise<{ text?: string }> }).default ?? mod;
  const data = await (fn as (buf: Buffer) => Promise<{ text?: string }>)(buffer);
  return (data?.text ?? '').trim();
}

/** Extract text from a DOCX buffer. */
async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return (result?.value ?? '').trim();
}

/** Extract text from XLSX/Excel buffer (all sheets concatenated). */
function extractXlsx(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (sheet) {
      const text = XLSX.utils.sheet_to_txt(sheet, { FS: '\t', RS: '\n' });
      if (text.trim()) parts.push(`Sheet: ${sheetName}\n${text}`);
    }
  }
  return parts.join('\n\n').trim();
}

/** CSV: use buffer as UTF-8 text (optionally normalize). */
function extractCsv(buffer: Buffer): string {
  return buffer.toString('utf-8').trim();
}

/** Plain text. */
function extractTxt(buffer: Buffer): string {
  return buffer.toString('utf-8').trim();
}

/** Extract main text from HTML (e.g. webpage). */
function extractHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, iframe').remove();
  const text = $('body').text() ?? $('html').text() ?? '';
  return text.replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number = MAX_TEXT_LENGTH): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\n\n[Content truncated for length.]';
}

export async function ingestFile(
  buffer: Buffer,
  filename: string,
  projectId: string,
  tenantId: string
): Promise<IngestResult> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const baseName = filename.replace(/\.[^/.]+$/, '');

  let text: string;
  try {
    switch (ext) {
      case 'pdf':
        text = await extractPdf(buffer);
        break;
      case 'docx':
      case 'doc':
        text = await extractDocx(buffer);
        break;
      case 'xlsx':
      case 'xls':
        text = extractXlsx(buffer);
        break;
      case 'csv':
        text = extractCsv(buffer);
        break;
      case 'txt':
        text = extractTxt(buffer);
        break;
      default:
        return {
          success: false,
          title: filename,
          entriesCreated: 0,
          error: `Unsupported file type: .${ext}. Use PDF, DOCX, XLSX, CSV, or TXT.`,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      title: filename,
      entriesCreated: 0,
      error: `Failed to parse file: ${message}`,
    };
  }

  if (!text || text.length < 2) {
    return {
      success: false,
      title: filename,
      entriesCreated: 0,
      error: 'No text could be extracted from the file.',
    };
  }

  const content = truncate(text);
  const entry = await projectKnowledgeRepo.create(projectId, tenantId, {
    title: `Document: ${baseName}`,
    content,
  });
  return {
    success: !!entry,
    title: filename,
    entriesCreated: entry ? 1 : 0,
  };
}

const FETCH_TIMEOUT_MS = 15000;

export async function ingestUrl(
  url: string,
  projectId: string,
  tenantId: string
): Promise<IngestResult> {
  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'ConverseAI-KnowledgeBot/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return {
        success: false,
        title: url,
        entriesCreated: 0,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }
    html = await res.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      title: url,
      entriesCreated: 0,
      error: message.includes('abort') ? 'Request timed out.' : message,
    };
  }

  const text = extractHtml(html);
  if (!text || text.length < 10) {
    return {
      success: false,
      title: url,
      entriesCreated: 0,
      error: 'No main text could be extracted from the page.',
    };
  }

  const content = truncate(text);
  const host = new URL(url).hostname;
  const entry = await projectKnowledgeRepo.create(projectId, tenantId, {
    title: `Website: ${host}`,
    content,
  });
  return {
    success: !!entry,
    title: url,
    entriesCreated: entry ? 1 : 0,
  };
}
