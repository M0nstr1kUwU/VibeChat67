<script setup lang="ts">
import { computed } from "vue";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { UserAccount } from "../types/user";

const props = defineProps<{
  status?: string;
  user: UserAccount;
}>();

const avatarUrl = computed(() => {
  if (!props.user.avatarPath) {
    return "";
  }

  return convertFileSrc(
      props.user.avatarPath,
      "asset"
  );
});

const initials = computed(() => {
  const name =
      props.user.nickname.trim();

  if (!name) {
    return "?";
  }

  const parts = name.split(/\s+/);

  if (parts.length >= 2) {
    return (
        parts[0][0] +
        parts[1][0]
    ).toUpperCase();
  }

  return name
      .slice(0, 2)
      .toUpperCase();
});
</script>

<template>
  <header class="header">
    <div class="header-title">
      <h1>Vibe Chat 67</h1>
      <p>{{ status }}</p></div>
    <div class="header-right">
      <div class="profile">
        <div class="profile-avatar">
          <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="user.nickname"
          />
          <span v-else>{{ initials }}</span>
        </div>
        <div class="profile-info">
          <strong>{{ user.nickname }}</strong>
          <span>@{{ user.login }}</span>
        </div>
      </div>
      <span class="badge">Локально</span>
    </div>
  </header>
</template>

<style scoped>
.header {
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 24px;
  border-bottom: 1px solid #292c34;
  background: #17191f;
}

.header-title {
  min-width: 0;
}

.header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #8f96a3;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.profile-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: #384b82;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  user-select: none;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.profile-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-info strong {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.profile-info span {
  color: #858c98;
  font-size: 11px;
}

.badge {
  padding: 6px 12px;
  border: 1px solid #343842;
  border-radius: 6px;
  color: #afb5c0;
  background: #20232a;
  font-size: 12px;
  white-space: nowrap;
}

@media (max-width: 700px) {
  .profile-info {
    display: none;
  }

  .header {
    padding: 12px 16px;
  }

  .header-right {
    gap: 8px;
  }

  .badge {
    display: none;
  }
}
</style>