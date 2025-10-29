<template>
  <div class="bill-detail">
    <div class="bill-detail__header">
      <h2>{{ bill.supplier }}</h2>
      <BaseButton variant="ghost" @click="$emit('close')">×</BaseButton>
    </div>
    <BillForm 
      v-if="bill" 
      :initial-data="billData" 
      @save="handleSave" 
      @cancel="$emit('close')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BillProjection } from '../../services/database';
import BillForm from '../molecules/BillForm.vue';
import BaseButton from '../atoms/BaseButton.vue';
import { billService } from '../../services/billService';

const props = defineProps<{
  bill: BillProjection | null;
}>();

const billData = computed(() => {
  if (!props.bill) return undefined;
  return {
    billNo: props.bill.billNo,
    supplier: props.bill.supplier,
    billDate: props.bill.billDate,
    dueDate: props.bill.dueDate,
    account: props.bill.account,
    lineDescription: props.bill.lineDescription,
    lineAmount: props.bill.lineAmount,
    terms: props.bill.terms,
    location: props.bill.location,
    memo: props.bill.memo,
    currency: props.bill.currency,
  };
});

const handleSave = async (data: any) => {
  if (!props.bill) return;
  await billService.updateBill(props.bill.id, {
    ...data,
    billDate: new Date(data.billDate),
    dueDate: new Date(data.dueDate),
  });
  emit('close');
};

const emit = defineEmits<{
  close: [];
}>();
</script>

<style scoped>
.bill-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.bill-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.bill-detail__header h2 {
  margin: 0;
  font-weight: 600;
  color: #202020;
}
</style>

