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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

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
        return res.status(503).json({
          error: 'GEMINI_API_KEY non configurée sur le serveur, bascule sur le moteur IA local.',
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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
      console.error('Gemini moderation error:', error);
      return res.status(500).json({
        error: 'Erreur lors de l’analyse Gemini',
      });
    }
  });

  // 2. Server-side Gemini Audio Transcription Endpoint for Microphone Voice Search
  app.post('/api/ai/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body as {
        audioBase64: string;
        mimeType?: string;
      };

      if (!audioBase64) {
        return res.status(400).json({ error: 'Audio manquant' });
      }

      const ai = getGenAIClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY non configurée' });
      }

      const cleanBase64 = audioBase64.includes('base64,')
        ? audioBase64.split('base64,')[1]
        : audioBase64;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: cleanBase64,
              },
            },
            {
              text: 'Transcris exactement ce qui est dit dans cet enregistrement vocal pour une recherche vidéo. Renvoie uniquement le texte transcrit sans guillemets ni commentaires.',
            },
          ],
        },
      });

      return res.json({
        transcript: (response.text || '').trim(),
      });
    } catch (error) {
      console.error('Gemini transcription error:', error);
      return res.status(500).json({ error: 'Erreur de transcription vocale' });
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
