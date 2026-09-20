import { get, set } from 'idb-keyval'

const TRANSLATE_CACHE_KEY = 'typewords_translate_cache'

// Global queue to prevent 429 Too Many Requests
let queue: (() => Promise<void>)[] = []
let activeCount = 0
const MAX_CONCURRENT = 2

async function processQueue() {
  if (activeCount >= MAX_CONCURRENT || queue.length === 0) return
  activeCount++
  const task = queue.shift()
  if (task) {
    try {
      await task()
    } finally {
      activeCount--
      setTimeout(processQueue, 300) // 300ms delay between requests to be safe
    }
  }
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(async () => {
      try {
        resolve(await task())
      } catch (e) {
        reject(e)
      }
    })
    processQueue()
  })
}

export function useTranslateText() {
  const cache = new Map<string, string>()
  let isInit = false

  async function initCache() {
    if (isInit) return
    const stored = await get(TRANSLATE_CACHE_KEY)
    if (stored) {
      Object.entries(stored).forEach(([k, v]) => cache.set(k, v as string))
    }
    isInit = true
  }

  async function saveCache() {
    const obj = Object.fromEntries(cache)
    await set(TRANSLATE_CACHE_KEY, obj)
  }

  /** Translate text from Chinese to Vietnamese using API on the fly */
  async function translate(text: string): Promise<string> {
    if (!text || typeof text !== 'string') return text
    // Only translate if it contains Chinese characters
    if (!/[\u4e00-\u9fa5]/.test(text)) return text

    await initCache()
    if (cache.has(text)) {
      return cache.get(text)!
    }

    return enqueue(async () => {
      // Check cache again in case another queue item resolved it
      if (cache.has(text)) return cache.get(text)!
      try {
        // Use Google Translate free API
        const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=vi&dt=t&q=' + encodeURIComponent(text);
        const resp = await fetch(url)
        if (!resp.ok) {
          // Fallback to MyMemory if Google blocks us
          const mmUrl = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=zh-CN|vi';
          const mmResp = await fetch(mmUrl)
          const mmData = await mmResp.json()
          if (mmData && mmData.responseData && mmData.responseData.translatedText) {
             const result = mmData.responseData.translatedText
             cache.set(text, result)
             saveCache()
             return result
          }
          return text
        }
        
        const data = await resp.json()
        let result = ''
        if (data && data[0]) {
          result = data[0].map((item: any[]) => item[0]).join('')
        }
        
        if (result) {
          cache.set(text, result)
          saveCache() // non-blocking
          return result
        }
      } catch (e) {
        console.warn('Auto translate failed:', e)
      }
      return text
    })
  }

  return {
    translate
  }
}

