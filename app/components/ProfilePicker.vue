<script setup lang="ts">
/**
 * ProfilePicker — Màn hình chọn profile đơn giản cho nhóm học cùng nhau.
 * Không cần login/password — chỉ click chọn tên để bắt đầu.
 * Data của mỗi profile được lưu và sync riêng biệt qua Supabase.
 */
const PROFILE_KEY = 'typewords_active_profile'

const emit = defineEmits<{ selected: [profile: string] }>()

const profiles = [
  { id: 'B', emoji: '📚', color: '#6366f1' },
  { id: 'M', emoji: '🌟', color: '#ec4899' },
]

function selectProfile(id: string) {
  localStorage.setItem(PROFILE_KEY, id)
  emit('selected', id)
}
</script>

<template>
  <div class="profile-picker-overlay">
    <div class="profile-picker-card">
      <div class="picker-logo">
        <span class="logo-icon">⌨️</span>
        <h1 class="logo-title">TypeWords</h1>
        <p class="logo-sub">Học tiếng Anh cùng nhau</p>
      </div>

      <h2 class="picker-question">Bạn là ai?</h2>

      <div class="profile-list">
        <button
          v-for="p in profiles"
          :key="p.id"
          class="profile-btn"
          :style="{ '--profile-color': p.color }"
          @click="selectProfile(p.id)"
        >
          <span class="profile-emoji">{{ p.emoji }}</span>
          <span class="profile-name">{{ p.id }}</span>
          <span class="profile-hint">Tiếp tục với profile {{ p.id }}</span>
        </button>
      </div>

      <p class="picker-note">Dữ liệu học của mỗi người được lưu riêng biệt ✨</p>
    </div>
  </div>
</template>

<style scoped>
.profile-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  font-family: 'Inter', system-ui, sans-serif;
}

.profile-picker-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 48px 56px;
  text-align: center;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.4);
}

.picker-logo {
  margin-bottom: 40px;
}

.logo-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.logo-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 6px;
  letter-spacing: -0.5px;
}

.logo-sub {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.picker-question {
  font-size: 18px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 28px;
}

.profile-list {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 32px;
}

.profile-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.profile-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--profile-color);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.profile-btn:hover::before {
  opacity: 0.15;
}

.profile-btn:hover {
  border-color: var(--profile-color);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.profile-btn:active {
  transform: translateY(-2px);
}

.profile-emoji {
  font-size: 36px;
  position: relative;
}

.profile-name {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 2px;
  color: var(--profile-color);
  position: relative;
}

.profile-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  position: relative;
}

.picker-note {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}
</style>
