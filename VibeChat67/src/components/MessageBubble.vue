<script setup lang="ts">
import type {Message} from "../types/message";

defineProps<{
  message: Message;
}>()
</script>

<template>
  <article class="message">
    <p>{{ message.body }}</p>
  </article>
</template>

<style scoped>

.message {
  align-self: flex-end;
  max-width: 70%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #386be0;
}

.message p {
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message footer {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: #ccd8f7;
  font-size: 10px;
}

</style>