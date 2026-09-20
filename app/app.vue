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

// --- Profile system ---
const PROFILE_KEY = 'typewords_active_profile'
const activeProfile = ref<string | null>(null)
const showPicker = ref(false)

onMounted(() => {
  const saved = localStorage.getItem(PROFILE_KEY)
  if (saved) {
    activeProfile.value = saved
  } else {
    showPicker.value = true
  }
})

function onProfileSelected(profile: string) {
  activeProfile.value = profile
  showPicker.value = false
}
</script>

<template>
  <!-- Profile picker overlay — hiện khi chưa chọn profile -->
  <ProfilePicker v-if="showPicker" @selected="onProfileSelected" />

  <NuxtLayout v-else>
    <NuxtPage />
  </NuxtLayout>
</template>
