<template>
  <div class="bill-list">
    <div class="bill-list__header">
      <h2>Bills</h2>
      <BaseButton variant="primary" size="small" @click="$emit('create-bill')">
        + Add Bill
      </BaseButton>
    </div>
    <div class="bill-list__content">
      <div v-if="loading" class="bill-list__empty">Loading...</div>
      <div v-else-if="bills.length === 0" class="bill-list__empty">
        No bills yet. Right-click on text in Gmail or Outlook to mark as bill.
      </div>
      <BillListItem
        v-for="bill in bills"
        :key="bill.id"
        :bill="bill"
        @click="$emit('bill-selected', bill)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { billService } from '../../services/billService';
import type { BillProjection } from '../../services/database';
import BillListItem from '../molecules/BillListItem.vue';
import BaseButton from '../atoms/BaseButton.vue';

const bills = ref<BillProjection[]>([]);
const loading = ref(true);

const loadBills = async () => {
  loading.value = true;
  try {
    bills.value = await billService.getAllBills();
  } catch (error) {
    console.error('Failed to load bills:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadBills();
});

defineEmits<{
  'bill-selected': [bill: BillProjection];
  'create-bill': [];
}>();

defineExpose({
  refresh: loadBills
});
</script>

<style scoped>
.bill-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.bill-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.bill-list__header h2 {
  margin: 0;
  font-weight: 600;
  color: #202020;
}

.bill-list__content {
  flex: 1;
  overflow-y: auto;
}

.bill-list__empty {
  padding: 2rem;
  text-align: center;
  color: #666;
}
</style>

