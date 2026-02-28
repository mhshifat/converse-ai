/**
 * Groq Speech-to-Text (Whisper) and Text-to-Speech for voice channel.
 * Uses GROQ_API_KEY.
 */

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const STT_MODEL = 'whisper-large-v3-turbo';
const TTS_MODEL = 'canopylabs/orpheus-v1-english';
const TTS_VOICE = 'austin';

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY ?? '';
  if (!key) throw new Error('GROQ_API_KEY is not set');
  return key;
}

function getTtsModel(): string {
  return process.env.GROQ_TTS_MODEL ?? TTS_MODEL;
}

function getTtsVoice(): string {
  return process.env.GROQ_TTS_VOICE ?? TTS_VOICE;
}

/**
 * Transcribe audio buffer to text using Groq Whisper.
 * Supports webm, mp3, wav, etc. Sends buffer with content-type and filename for format detection.
 */
export async function transcribeAudio(
  buffer: Buffer,
  options?: { contentType?: string }
): Promise<string> {
  const apiKey = getApiKey();
  if (buffer.length === 0) {
    throw new Error('Groq STT failed: audio buffer is empty');
  }
  const contentType = options?.contentType ?? 'audio/webm';
  const ext = contentType.includes('webm') ? 'webm' : contentType.includes('mp3') ? 'mp3' : 'wav';
  const formData = new FormData();
  const blob = new Blob([buffer], { type: contentType });
  formData.append('file', blob, `audio.${ext}`);
  formData.append('model', STT_MODEL);
  formData.append('response_format', 'text');

  const res = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq STT failed: ${res.status} ${err}`);
  }

  const text = await res.text();
  return text.trim();
}

/**
 * Synthesize text to speech using Groq TTS. Returns WAV buffer.
 * Orpheus model requires one-time terms acceptance: https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english
 */
export async function synthesizeSpeech(
  text: string,
  options?: { model?: string; voice?: string }
): Promise<Buffer> {
  const apiKey = getApiKey();
  const model = options?.model ?? getTtsModel();
  const voice = options?.voice ?? getTtsVoice();

  const res = await fetch(`${GROQ_API_BASE}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      voice,
      input: text.slice(0, 4096),
      response_format: 'wav',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    try {
      const errJson = JSON.parse(errText) as {
        error?: { code?: string; message?: string };
      };
      if (errJson?.error?.code === 'model_terms_required') {
        throw new Error(
          `Groq TTS model "${model}" requires terms acceptance. ` +
            'Open this link and accept the terms: https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english'
        );
      }
      if (errJson?.error?.code === 'rate_limit_exceeded' || res.status === 429) {
        throw new Error(
          'Groq TTS rate limit reached. The client will use browser TTS as fallback. ' +
            'To increase limits, upgrade at https://console.groq.com/settings/billing'
        );
      }
    } catch (e) {
      if (e instanceof Error && (e.message.startsWith('Groq TTS model') || e.message.startsWith('Groq TTS rate'))) throw e;
    }
    throw new Error(`Groq TTS failed: ${res.status} ${errText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
