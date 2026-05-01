/**
 * Servicio de moderación de contenido para validar retos.
 * Usa DeepSeek como API de IA y una lista negra local como primera capa.
 *
 * Endpoint DeepSeek: https://api.deepseek.com/v1/chat/completions
 * Modelo: deepseek-chat
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// ============================================================
// Capa 1: Lista negra de patrones (gratuito, instantáneo)
// ============================================================

const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(armas?|pistola|rifle|disparar?|matar|asesinar?)\b/i, reason: 'Contenido violento' },
  { pattern: /\b(drogas?|coca[ií]na|marihuana|hero[ií]na|fentanilo|meth|anfetaminas?)\b/i, reason: 'Referencia a sustancias ilegales' },
  { pattern: /\b(suicid|autolesi[oó]n|cutting|colgarse)\b/i, reason: 'Contenido de autolesión' },
  { pattern: /\b(desnud|onlyfans|porno?|sexual|explicito)\b/i, reason: 'Contenido sexual explícito' },
  { pattern: /\b(odio|racista|xen[oó]fob|homof[oó]b|machista|mis[oó]gin)\b/i, reason: 'Contenido discriminatorio' },
  { pattern: /\b(apuesta|casino|poker|blackjack|ruleta)\b/i, reason: 'Apuestas' },
  { pattern: /\b(estafa|scam|piramidal|multinivel|criptomoneda)\b/i, reason: 'Posible estafa' },
];

export interface ModerationResult {
  flagged: boolean;
  reason: string | null;
  details: string | null;
}

function checkBlockedPatterns(text: string): ModerationResult | null {
  const haystack = text.toLowerCase();
  for (const entry of BLOCKED_PATTERNS) {
    if (entry.pattern.test(haystack)) {
      return { flagged: true, reason: entry.reason, details: `La frase contiene "${entry.reason.toLowerCase()}"` };
    }
  }
  return null;
}

// ============================================================
// Capa 2: DeepSeek Moderation (basado en prompt)
// ============================================================

function isDeepSeekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export async function moderateWithDeepSeek(
  title: string,
  description?: string | null,
  evidenceDescription?: string | null
): Promise<ModerationResult> {
  if (!isDeepSeekConfigured()) {
    return { flagged: false, reason: null, details: null };
  }

  const fullText = [title, description, evidenceDescription].filter(Boolean).join('\n');

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: `Eres un moderador de contenido para una app de retos fitness y hábitos saludables.
Analiza el siguiente reto y determina si contiene contenido:
- Violento (armas, peleas, daño físico)
- Ofensivo (insultos, lenguaje vulgar)
- Peligroso (retos que ponen en riesgo la salud física o mental)
- Discriminatorio (racismo, sexismo, homofobia, xenofobia)
- Sexual (contenido para adultos)
- Estafas o esquemas piramidales

Responde ÚNICAMENTE con un JSON válido:
{ "flagged": true/false, "reason": "categoría o null", "details": "explicación breve en español o null" }

Si el reto es apropiado (fitness, lectura, alimentación, meditación, hábitos), responde flagged: false.`,
          },
          {
            role: 'user',
            content: fullText,
          },
        ],
        temperature: 0,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      console.warn('DeepSeek moderation API error:', response.status);
      return { flagged: false, reason: null, details: null };
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
    };
    const rawContent = data.choices?.[0]?.message?.content ?? '';
    
    // Extraer JSON de la respuesta (puede venir con markdown)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { flagged: false, reason: null, details: null };

    const parsed = JSON.parse(jsonMatch[0]) as {
      flagged?: boolean;
      reason?: string | null;
      details?: string | null;
    };

    return {
      flagged: Boolean(parsed.flagged),
      reason: parsed.reason ?? null,
      details: parsed.details ?? null,
    };
  } catch (error) {
    console.error('DeepSeek moderation failed:', error);
    return { flagged: false, reason: null, details: null };
  }
}

// ============================================================
// Función principal: valida con capa 1 + capa 2
// ============================================================

export async function validateChallengeContent(params: {
  title: string;
  description?: string | null;
  evidenceDescription?: string | null;
}): Promise<ModerationResult> {
  // Capa 1: Patrones bloqueados (gratuito)
  const combinedText = [params.title, params.description, params.evidenceDescription]
    .filter(Boolean)
    .join(' ');
  const blockedResult = checkBlockedPatterns(combinedText);
  if (blockedResult) return blockedResult;

  // Capa 2: DeepSeek (si está configurado)
  const aiResult = await moderateWithDeepSeek(
    params.title,
    params.description,
    params.evidenceDescription
  );

  return aiResult;
}
