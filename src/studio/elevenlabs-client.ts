/**
 * ElevenLabs HTTP client — thin wrapper around the ElevenLabs REST API.
 * WS-STUDIO-1: YouTube production pipeline tooling
 */

export class ElevenLabsClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Convert text to speech using the ElevenLabs API.
   * Returns raw MP3 bytes as a Buffer.
   */
  async textToSpeech(opts: { text: string; voiceId: string; modelId?: string }): Promise<Buffer> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${opts.voiceId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: opts.text,
        model_id: opts.modelId ?? 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const err = new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`) as any;
      err.statusCode = response.status;
      throw err;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
