<template>
  <div class="bill-list-item">
    <BaseCheckbox
      :model-value="selected"
      @update:model-value="$emit('toggle-selection')"
      @click.stop
    />
    <div class="bill-list-item__content" @click="$emit('click')">
      <div class="bill-list-item__header">
        <span class="bill-list-item__supplier">{{ bill.supplier }}</span>
        <span class="bill-list-item__amount">{{ bill.lineAmount }} {{ bill.currency || 'USD' }}</span>
      </div>
      <div class="bill-list-item__details">
        <span class="bill-list-item__bill-no">Bill #{{ bill.billNo }}</span>
        <span class="bill-list-item__date">Due: {{ new Date(bill.dueDate).toLocaleDateString() }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BillProjection } from '../../services/database';
import BaseCheckbox from '../atoms/BaseCheckbox.vue';

defineProps<{
  bill: BillProjection;
  selected: boolean;
}>();

defineEmits<{
  click: [];
  'toggle-selection': [];
}>();
</script>

<style scoped>
.bill-list-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s ease;
}

.bill-list-item:hover {
  background-color: #f9f9f9;
}

.bill-list-item__content {
  flex: 1;
  cursor: pointer;
}

.bill-list-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.bill-list-item__supplier {
  font-weight: 600;
  color: #202020;
}

.bill-list-item__amount {
  font-weight: 600;
  color: #dc4c3e;
}

.bill-list-item__details {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #666;
}

.bill-list-item__bill-no,
.bill-list-item__date {
  font-size: 0.875rem;
}
</style>


