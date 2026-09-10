<script setup lang="ts">
const emit = defineEmits<{
  select: [emoji: string];
}>();

const emojis = [
  "😀", "😃", "😄", "😁", "😆", "😅",
  "😂", "🤣", "😊", "😇", "🙂", "🙃",
  "😉", "😌", "😍", "🥰", "😘", "😗",
  "😎", "🤩", "🥳", "😢", "😭", "😡",
  "🤬", "😱", "🤔", "🤨", "😴", "🥱",
  "👍", "👎", "👏", "🙏", "❤️", "🔥",
  "🎉", "💀", "👀", "💩", "🚀", "⭐"
];

function selectEmoji(emoji: string) {
  emit("select", emoji);
}
</script>

<template>
  <div class="emoji-picker">
    <button
        v-for="emoji in emojis"
        :key="emoji"
        type="button"
        class="emoji"
        @click="selectEmoji(emoji)"
    >
      {{ emoji }}
    </button>
  </div>
</template>

<style scoped>
.emoji-picker {
  position: absolute;
  right: 80px;
  bottom: calc(100% + 10px);

  width: 320px;
  max-height: 240px;

  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;

  padding: 10px;

  background: #20232a;
  border: 1px solid #343842;
  border-radius: 10px;

  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);

  overflow-y: auto;
}

.emoji {
  width: 34px;
  height: 34px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;
  border: none;
  border-radius: 6px;

  background: transparent;
  cursor: pointer;

  font-size: 21px;
}

.emoji:hover {
  background: #343842;
}
</style>