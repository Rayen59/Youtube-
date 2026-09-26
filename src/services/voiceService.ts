export type VoiceLangCode = 'fr-FR' | 'en-US' | 'ar-SA';

export interface VoiceTranscriptionResult {
  transcript: string;
  originalTranscript: string;
  translatedTranscript: string;
  detectedLanguage?: string;
  error?: string;
}

const LOCAL_TRANSLATION_DICTIONARY: Record<
  string,
  { 'fr-FR': string; 'en-US': string; 'ar-SA': string }
> = {
  nature: { 'fr-FR': 'nature 4K', 'en-US': '4K nature', 'ar-SA': 'طبيعة 4K' },
  musique: { 'fr-FR': 'musique', 'en-US': 'music', 'ar-SA': 'موسيقى' },
  music: { 'fr-FR': 'musique', 'en-US': 'music', 'ar-SA': 'موسيقى' },
  موسيقى: { 'fr-FR': 'musique', 'en-US': 'music', 'ar-SA': 'موسيقى' },
  طبيعة: { 'fr-FR': 'nature', 'en-US': 'nature', 'ar-SA': 'طبيعة' },
  film: { 'fr-FR': 'cinéma et film', 'en-US': 'movies and cinema', 'ar-SA': 'أفلام وسينما' },
  movie: { 'fr-FR': 'cinéma et film', 'en-US': 'movie', 'ar-SA': 'فيلم' },
  أفلام: { 'fr-FR': 'cinéma', 'en-US': 'movies', 'ar-SA': 'أفلام' },
  فيلم: { 'fr-FR': 'film', 'en-US': 'movie', 'ar-SA': 'فيلم' },
  jeu: { 'fr-FR': 'jeux vidéo gaming', 'en-US': 'video games gaming', 'ar-SA': 'ألعاب فيديو' },
  gaming: { 'fr-FR': 'gaming', 'en-US': 'gaming', 'ar-SA': 'ألعاب' },
  ألعاب: { 'fr-FR': 'gaming jeux', 'en-US': 'gaming', 'ar-SA': 'ألعاب' },
  espace: { 'fr-FR': 'espace et science', 'en-US': 'space and science', 'ar-SA': 'الفضاء والعلوم' },
  space: { 'fr-FR': 'espace', 'en-US': 'space', 'ar-SA': 'فضاء' },
  فضاء: { 'fr-FR': 'espace', 'en-US': 'space', 'ar-SA': 'فضاء' },
  océan: { 'fr-FR': 'océan 4K', 'en-US': 'ocean 4K', 'ar-SA': 'محيط 4K' },
  ocean: { 'fr-FR': 'océan', 'en-US': 'ocean', 'ar-SA': 'محيط' },
  بحر: { 'fr-FR': 'océan mer', 'en-US': 'ocean sea', 'ar-SA': 'بحر' },
  voiture: { 'fr-FR': 'voiture sport', 'en-US': 'sports car', 'ar-SA': 'سيارة رياضية' },
  car: { 'fr-FR': 'voiture', 'en-US': 'car', 'ar-SA': 'سيارة' },
  سيارة: { 'fr-FR': 'voiture', 'en-US': 'car', 'ar-SA': 'سيارة' },
  intelligence: {
    'fr-FR': 'intelligence artificielle IA',
    'en-US': 'artificial intelligence AI',
    'ar-SA': 'الذكاء الاصطناعي',
  },
  animation: { 'fr-FR': 'animation 3D', 'en-US': '3D animation', 'ar-SA': 'رسوم متحركة 3D' },
};

/**
 * Translates text into the target language using the backend Gemini API with instant local fallback
 */
export async function translateVoiceText(
  text: string,
  targetLang: VoiceLangCode
): Promise<string> {
  const cleaned = (text || '').trim();
  if (!cleaned) return '';

  const lower = cleaned.toLowerCase();
  if (LOCAL_TRANSLATION_DICTIONARY[lower]) {
    return LOCAL_TRANSLATION_DICTIONARY[lower][targetLang];
  }

  try {
    const resp = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleaned,
        targetLang,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.translatedText && data.translatedText.trim()) {
        return data.translatedText.trim();
      }
    }
  } catch {
    // Fallback below
  }

  return cleaned;
}

/**
 * Sends a recorded audio Blob to /api/ai/transcribe and returns the transcribed & translated text
 */
export async function transcribeAudioBlob(params: {
  audioBlob: Blob;
  mimeType: string;
  lang: VoiceLangCode;
  translateToTarget: boolean;
}): Promise<VoiceTranscriptionResult> {
  const { audioBlob, mimeType, lang, translateToTarget } = params;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      try {
        const resp = await fetch('/api/ai/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: (mimeType || 'audio/webm').split(';')[0],
            lang,
            translateToTarget,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const transcript = (data.transcript || '').trim();
          const originalTranscript = (data.originalTranscript || transcript).trim();
          const translatedTranscript = (data.translatedTranscript || transcript).trim();

          if (transcript) {
            resolve({
              transcript,
              originalTranscript,
              translatedTranscript,
              detectedLanguage: data.detectedLanguage || lang,
            });
            return;
          }

          resolve({
            transcript: '',
            originalTranscript: '',
            translatedTranscript: '',
            error:
              data.error ||
              'Aucune parole détectée dans l’enregistrement. Parlez plus près du microphone.',
          });
          return;
        }
      } catch {
        // Fallback error below
      }

      resolve({
        transcript: '',
        originalTranscript: '',
        translatedTranscript: '',
        error: 'Impossible de contacter le serveur de transcription vocale.',
      });
    };

    reader.onerror = () => {
      resolve({
        transcript: '',
        originalTranscript: '',
        translatedTranscript: '',
        error: 'Erreur de lecture du flux audio.',
      });
    };

    reader.readAsDataURL(audioBlob);
  });
}
