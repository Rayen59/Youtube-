import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const MODELS_PRIORITY = ['gemini-3-flash-preview', 'gemini-2.5-flash'];

async function generateWithModelFallback(
  ai: GoogleGenAI,
  payload: {
    contents: any;
    config?: any;
  }
) {
  let lastErr: unknown = null;
  for (const modelName of MODELS_PRIORITY) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: payload.contents,
        config: payload.config,
      });
      return response;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

const LANG_NAMES: Record<string, string> = {
  'fr-FR': 'français (French)',
  'en-US': 'anglais (English)',
  'ar-SA': 'arabe (Arabic)',
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  // 1. Server-side Gemini AI Content Moderation Endpoint
  app.post('/api/ai/moderate', async (req, res) => {
    try {
      const { text, contextType, imageBase64, mimeType } = req.body as {
        text?: string;
        contextType?: string;
        imageBase64?: string;
        mimeType?: string;
      };

      const ai = getGenAIClient();
      if (!ai) {
        return res.status(200).json({
          fallbackToLocal: true,
        });
      }

      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

      if (imageBase64 && imageBase64.includes('base64,')) {
        const cleanBase64 = imageBase64.split('base64,')[1];
        const detectedMime =
          mimeType ||
          imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';')) ||
          'image/jpeg';
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: detectedMime,
          },
        });
      }

      parts.push({
        text: `Analyse de sécurité et modération stricte pour la plateforme vidéo MK Streaming (Contexte: ${
          contextType || 'général'
        }).
Contenu texte soumis : "${text || ''}"

Évalue si ce contenu (texte et/ou image) comporte un élément inapproprié :
- Contenu adulte, pornographie, nudité explicite ou implicite (NSFW)
- Violence grave, gore, apologie du terrorisme, armes, menaces de mort ou d'agression
- Discours haineux, racisme, xénophobie, homophobie, antisémitisme, islamophobie
- Harcèlement, insultes graves, vulgarité extrême (en français, anglais, arabe ou argot)
- Drogues dures, arnaques financières, phishing ou activités illégales.

Si le moindre élément inapproprié est détecté, mets "blocked": true et "isAppropriate": false.`,
      });

      const response = await generateWithModelFallback(ai, {
        contents: { parts },
        config: {
          systemInstruction:
            'Tu es le Bouclier IA de Modération Automatique de MK Streaming. Tu bloques immédiatement tout contenu inapproprié, vulgaire, violent, haineux, sexuel ou dangereux. Réponds uniquement en JSON valide en français.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isAppropriate: {
                type: Type.BOOLEAN,
                description: 'True si le contenu est sain et approprié, False sinon.',
              },
              blocked: {
                type: Type.BOOLEAN,
                description: 'True si le contenu doit être bloqué automatiquement.',
              },
              violationCategory: {
                type: Type.STRING,
                description:
                  'Catégorie : Aucune, Contenu Adulte / NSFW, Violence & Menaces, Discours Haineux, Harcèlement & Insultes, ou Contenu Illégal & Spam.',
              },
              severity: {
                type: Type.STRING,
                description: 'low, medium, high, ou critical',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Score de certitude IA entre 85 et 100',
              },
              reason: {
                type: Type.STRING,
                description: 'Explication claire et professionnelle en français du blocage.',
              },
              flaggedTerms: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Mots ou éléments problématiques détectés.',
              },
            },
            required: [
              'isAppropriate',
              'blocked',
              'violationCategory',
              'severity',
              'confidence',
              'reason',
              'flaggedTerms',
            ],
          },
        },
      });

      const jsonText = response.text || '{}';
      const parsed = JSON.parse(jsonText);
      return res.json(parsed);
    } catch (error) {
      // Return 200 with fallbackToLocal so client never logs a 500 network error
      return res.status(200).json({
        fallbackToLocal: true,
      });
    }
  });

  // 2. Server-side Gemini Audio Transcription & Voice Translation Endpoint
  app.post('/api/ai/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType, lang, translateToTarget } = req.body as {
        audioBase64: string;
        mimeType?: string;
        lang?: string;
        translateToTarget?: boolean;
      };

      if (!audioBase64) {
        return res.status(400).json({ error: 'Audio manquant' });
      }

      const ai = getGenAIClient();
      if (!ai) {
        return res.status(200).json({
          transcript: '',
          error: 'Clé API Gemini non configurée sur le serveur.',
        });
      }

      const cleanBase64 = audioBase64.includes('base64,')
        ? audioBase64.split('base64,')[1]
        : audioBase64;

      const targetLanguageLabel = LANG_NAMES[lang || 'fr-FR'] || 'français (French)';
      const shouldTranslate = translateToTarget !== false;

      const response = await generateWithModelFallback(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: (mimeType || 'audio/webm').split(';')[0],
                data: cleanBase64,
              },
            },
            {
              text: shouldTranslate
                ? `Écoute attentivement cet enregistrement vocal.
1. Transcris exactement ce que la personne dit dans "originalTranscript".
2. Traduis (ou garde si c'est déjà dans cette langue) ce qui est dit vers la langue cible "${targetLanguageLabel}" dans "translatedTranscript".
3. Si l'audio ne contient aucun mot parlé (seulement du silence ou du bruit de fond), renvoie des chaînes vides "".
Réponds strictement en JSON.`
                : `Écoute attentivement cet enregistrement vocal (langue attendue: ${targetLanguageLabel}).
Transcris exactement les paroles prononcées dans "originalTranscript" et "translatedTranscript".
Si l'audio ne contient aucun mot parlé (seulement du silence), renvoie des chaînes vides "".
Réponds strictement en JSON.`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              originalTranscript: {
                type: Type.STRING,
                description: 'Transcription exacte dans la langue parlée.',
              },
              translatedTranscript: {
                type: Type.STRING,
                description: `Texte transcrit et traduit en ${targetLanguageLabel}.`,
              },
              detectedLanguage: {
                type: Type.STRING,
                description: 'Langue détectée (ex: fr, en, ar).',
              },
            },
            required: ['originalTranscript', 'translatedTranscript'],
          },
        },
      });

      const rawText = (response.text || '{}').trim();
      let parsed: {
        originalTranscript?: string;
        translatedTranscript?: string;
        detectedLanguage?: string;
      } = {};
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          originalTranscript: rawText,
          translatedTranscript: rawText,
        };
      }

      const finalTranscript = (
        shouldTranslate
          ? parsed.translatedTranscript || parsed.originalTranscript || ''
          : parsed.originalTranscript || parsed.translatedTranscript || ''
      ).trim();

      return res.json({
        transcript: finalTranscript,
        originalTranscript: (parsed.originalTranscript || finalTranscript).trim(),
        translatedTranscript: (parsed.translatedTranscript || finalTranscript).trim(),
        detectedLanguage: parsed.detectedLanguage || lang || 'fr-FR',
      });
    } catch (error) {
      console.error('Gemini transcription error:', error);
      return res.status(200).json({
        transcript: '',
        error: 'Le service vocal IA est temporairement indisponible.',
      });
    }
  });

  // 3. Server-side Gemini Text Translation Endpoint (for instant voice-text translation FR / EN / AR)
  app.post('/api/ai/translate', async (req, res) => {
    try {
      const { text, targetLang } = req.body as {
        text?: string;
        targetLang?: string;
      };

      const cleaned = (text || '').trim();
      if (!cleaned) {
        return res.json({ translatedText: '' });
      }

      const ai = getGenAIClient();
      if (!ai) {
        return res.json({ translatedText: cleaned });
      }

      const targetLanguageLabel = LANG_NAMES[targetLang || 'fr-FR'] || 'français (French)';

      const response = await generateWithModelFallback(ai, {
        contents: `Traduis le texte suivant en ${targetLanguageLabel}. Renvoie uniquement la traduction directe sans guillemets ni explications :\n\n"${cleaned}"`,
      });

      const translated = (response.text || cleaned).trim().replace(/^["«]|["»]$/g, '');
      return res.json({
        translatedText: translated || cleaned,
      });
    } catch (error) {
      return res.json({
        translatedText: (req.body?.text || '').trim(),
      });
    }
  });

  // Mount Vite in dev or static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MK Streaming Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
