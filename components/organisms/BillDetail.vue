<template>
  <div class="bill-detail" v-if="bill">
    <div class="bill-detail__header">
      <h2>{{ bill.supplier }}</h2>
      <div class="bill-detail__header-actions">
        <BaseButton 
          variant="danger" 
          size="small"
          @click="handleDelete"
          :disabled="deleting"
        >
          Delete
        </BaseButton>
        <BaseButton variant="ghost" @click="$emit('close')">×</BaseButton>
      </div>
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
import { computed, ref } from 'vue';
import type { BillProjection } from '../../services/database';
import BillForm from '../molecules/BillForm.vue';
import BaseButton from '../atoms/BaseButton.vue';
import { billService } from '../../services/billService';

const props = defineProps<{
  bill: BillProjection | null;
}>();

const deleting = ref(false);

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

const handleDelete = async () => {
  if (!props.bill) return;
  
  const confirmed = window.confirm(
    `Are you sure you want to delete the bill from ${props.bill.supplier}? This action cannot be undone.`
  );
  
  if (!confirmed) return;
  
  deleting.value = true;
  try {
    await billService.deleteBill(props.bill.id);
    emit('deleted');
    emit('close');
  } catch (error) {
    console.error('Failed to delete bill:', error);
    alert('Failed to delete bill. Please try again.');
  } finally {
    deleting.value = false;
  }
};

const emit = defineEmits<{
  close: [];
  deleted: [];
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

.bill-detail__header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>

