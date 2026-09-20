import type { Article, Sentence } from '../types'
import { Baidu, Translator } from '@/libs'
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

/***
 * @desc Gọi Gemini Flash API để dịch một đoạn văn bản sang tiếng Việt
 * @param text Văn bản cần dịch
 * @param apiKey Gemini API key
 * */
async function translateWithGemini(text: string, apiKey: string): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
  const prompt = `Translate the following English text to Vietnamese. Return ONLY the Vietnamese translation, no explanations, no original text:\n\n${text}`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!translated) throw new Error('Gemini returned empty translation')
  return translated
}

/***
 * @desc
 * @param article 文章实体
 * @param translateEngine 翻译引擎
 * @param allShow 是否翻译完所有之后才显示
 * @param progressCb 进度回调
 * */
export async function getNetworkTranslate(
  article: Article,
  translateEngine: TranslateEngine,
  allShow: boolean = false,
  progressCb?: (val: number) => void
) {
  // --- Gemini engine ---
  if (translateEngine === TranslateEngine.Gemini) {
    const config = useRuntimeConfig()
    const apiKey = config.public.geminiApiKey as string

    if (!apiKey) {
      console.error('[TypeWords] Gemini API key not configured')
      return
    }

    const allSentences: Sentence[] = article.sections.flat()
    const total = allSentences.length
    let index = 0

    // Dịch tiêu đề
    if (!article.titleTranslate && article.title) {
      try {
        article.titleTranslate = await translateWithGemini(article.title, apiKey)
      } catch (e) {
        // ignore title translation error
      }
    }

    // Dịch từng câu tuần tự (tránh rate limit)
    for (const sentence of allSentences) {
      let retries = 0
      while (retries < 3) {
        try {
          sentence.translate = await translateWithGemini(sentence.text, apiKey)
          if (!allShow) {
            article.textTranslate += sentence.translate + '\n'
          }
          break
        } catch (e) {
          retries++
          if (retries < 3) await new Promise(r => setTimeout(r, 1000 * retries))
        }
      }
      index++
      progressCb?.(Math.floor((index / total) * 100))
    }

    article.textTranslate = getSentenceAllTranslateText(article)
    progressCb?.(100)
    return
  }

  // --- Baidu engine (legacy) ---
  let translator: Translator
  if (translateEngine === TranslateEngine.Baidu) {
    translator = new Baidu({
      config: {
        appid: '',
        key: '',
      },
    }) as any
  }

  if (translator) {
    if (!article.titleTranslate) {
      translator.translate(article.title, 'en', 'zh-CN').then(r => {
        article.titleTranslate = r.trans.paragraphs[0]
      })
    }

    let promiseList = []
    let retryCount = 0
    let retryCountMap = new Map()

    const translate = async (sentence: Sentence) => {
      try {
        let r = await translator.translate(sentence.text, 'en', 'zh-CN')

        if (r) {
          const cb = () => {
            sentence.translate = r.trans.paragraphs[0]
            if (!allShow) {
              //一次显示所有，顺序会乱
              article.textTranslate += sentence.translate + '\n'
            }
          }
          return Promise.resolve(cb)
        } else {
          return Promise.reject(() => translate(sentence))
        }
      } catch (e) {
        return Promise.reject(() => translate(sentence))
      }
    }

    let total = 0
    let index = 0
    article.sections.map(v => (total += v.length))

    for (let i = 0; i < article.sections.length; i++) {
      let v = article.sections[i]
      for (let j = 0; j < v.length; j++) {
        let sentence = v[j]
        let promise = translate(sentence)
        if (allShow) {
          promiseList.push(promise)
        } else {
          retryCountMap.set(sentence.text, 0)
          let errResult: any
          let cb = await promise.catch(err => {
            errResult = err
          })

          while (errResult) {
            let count = retryCountMap.get(sentence.text)
            if (count > 2) break
            cb = await errResult().catch(err => {
              errResult = err
            })
            retryCountMap.set(sentence.text, count + 1)
          }
          if (cb) cb()
          index++
          if (progressCb) {
            progressCb(Math.floor((index / total) * 100))
          }
        }
      }
    }

    if (promiseList.length) {
      let timer: any = -1
      let progress = 0
      if (progressCb) {
        timer = setInterval(() => {
          progress++
          if (progress > 90) {
            return clearInterval(timer)
          }
          progressCb(progress)
        }, 100)
      }

      return new Promise(async resolve => {
        let cbs = []
        do {
          if (retryCount > 2) {
            return resolve(true)
          }
          let results = await Promise.allSettled(promiseList)
          promiseList = []
          results.map(results => {
            if (results.status === 'fulfilled') {
              cbs.push(results.value)
            } else {
              promiseList.push(results.reason())
            }
          })
          retryCount++
        } while (promiseList.length)
        cbs.map(v => v())
        article.textTranslate = getSentenceAllTranslateText(article)

        if (progressCb) {
          clearInterval(timer)
          progress = 100
          progressCb(100)
        }
        resolve(true)
      })
    } else {
      article.textTranslate = getSentenceAllTranslateText(article)
    }
  }
}
