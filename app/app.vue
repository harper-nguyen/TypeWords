<script setup lang="ts">
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const siteOrigin = String(runtimeConfig.public.origin || 'https://typewords.cc').replace(/\/$/, '')

const canonicalURL = $computed(() => new URL(route.path, `${siteOrigin}/`).toString())

const nonIndexableRoutePrefixes = [
  '/fsrs',
  '/import',
  '/practice-articles',
  '/practice-sentences',
  '/practice-words',
  '/rrweb',
  '/setting',
  '/test',
  '/words-test',
]

const robotsContent = $computed(() => {
  const hostname = import.meta.client ? window.location.hostname : new URL(`${siteOrigin}/`).hostname
  const isDevelopmentHost = ['dev.typewords.cc', 'localhost', '127.0.0.1'].includes(hostname)
  const isFunctionalPage = nonIndexableRoutePrefixes.some(prefix =>
    route.path === prefix || route.path.startsWith(`${prefix}/`)
  )

  return isDevelopmentHost || isFunctionalPage
    ? 'noindex, nofollow, noarchive'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
})

useHead(() => ({
  link: [
    {
      key: 'canonical',
      rel: 'canonical',
      href: canonicalURL,
    },
  ],
  meta: [
    {
      key: 'robots',
      name: 'robots',
      content: robotsContent,
    },
  ],
}))

import { onMounted } from 'vue'
import { useBaseStore } from '@/core/stores/base'

onMounted(() => {
  const baseStore = useBaseStore()
  // Migrate legacy Chinese system dict names from local storage
  if (baseStore.word?.bookList) {
    baseStore.word.bookList.forEach(dict => {
      if (dict.system) {
        if (dict.name === '收藏') dict.name = 'Favorites'
        if (dict.name === '错词') dict.name = 'Mistakes'
        if (dict.name === '已掌握') dict.name = 'Mastered'
        if (dict.description === '已掌握后的单词不会出现在练习中') {
          dict.description = 'Mastered words will not appear in practice'
        }
      }
    })
  }
  if (baseStore.article?.bookList) {
    baseStore.article.bookList.forEach(dict => {
      if (dict.system && dict.name === '收藏') {
        dict.name = 'Favorites'
      }
    })
  }
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
