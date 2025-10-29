<template>
  <input
    type="date"
    :class="['base-input', { 'base-input--error': error }]"
    :value="modelValue"
    :disabled="disabled"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  error?: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<style scoped>
.base-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.base-input:focus {
  outline: none;
  border-color: #dc4c3e;
}

.base-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.base-input--error {
  border-color: #dc4c3e;
}

.base-input::placeholder {
  color: #999;
}
</style>


