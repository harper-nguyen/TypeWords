import type { Article, Sentence } from '../types'
import { TranslateEngine } from '../types'

export function getSentenceAllTranslateText(article: Article) {
  return article.sections
    .map(v =>
      v
        .map(s => s.translate.trim())
        .filter(v => v)
        .join(' \n')
    )
    .filter(v => v)
    .join(' \n\n')
}

export function getSentenceAllText(article: Article) {
  return article.sections
    .map(v =>
      v
        .map(s => s.text)
        .filter(v => v)
        .join('\n')
    )
    .filter(v => v)
    .join('\n\n')
}

/** Translate a single English sentence to Vietnamese using Gemini API */
async function translateWithGemini(text: string): Promise<string> {
  const config = useRuntimeConfig()
  const apiKey = config.public.geminiApiKey as string
  if (!apiKey) throw new Error('No Gemini API key configured')

  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Translate the following English text to Vietnamese. Return only the Vietnamese translation, nothing else.\n\n${text}`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }),
  })

  const data = await resp.json()
  const result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!result) throw new Error('Empty response from Gemini')
  return result
}

/***
 * @desc Translate article sentences using Gemini API
 * @param article Article entity
 * @param translateEngine Translation engine (Gemini)
 * @param allShow Whether to show all translations at once after all complete
 * @param progressCb Progress callback (0-100)
 */
export async function getNetworkTranslate(
  article: Article,
  translateEngine: TranslateEngine,
  allShow: boolean = false,
  progressCb?: (val: number) => void
) {
  // Translate title if not already translated
  if (!article.titleTranslate && article.title) {
    try {
      article.titleTranslate = await translateWithGemini(article.title)
    } catch (e) {
      console.warn('Title translation failed:', e)
    }
  }

  // Flatten all sentences
  const sentences: Sentence[] = []
  article.sections.forEach(section => sentences.push(...section))
  const total = sentences.length
  if (total === 0) return

  let done = 0
  const CONCURRENCY = 3 // parallel requests to respect rate limits

  // Process in batches for concurrency control
  for (let i = 0; i < sentences.length; i += CONCURRENCY) {
    const batch = sentences.slice(i, i + CONCURRENCY)

    await Promise.allSettled(
      batch.map(async sentence => {
        if (!sentence.translate) {
          try {
            const translated = await translateWithGemini(sentence.text)
            sentence.translate = translated
            if (!allShow) {
              article.textTranslate += sentence.translate + '\n'
            }
          } catch (e) {
            // Retry once
            try {
              const translated = await translateWithGemini(sentence.text)
              sentence.translate = translated
              if (!allShow) {
                article.textTranslate += sentence.translate + '\n'
              }
            } catch {
              sentence.translate = ''
            }
          }
        }
        done++
        if (progressCb) progressCb(Math.floor((done / total) * 100))
      })
    )
  }

  article.textTranslate = getSentenceAllTranslateText(article)
  if (progressCb) progressCb(100)
}
