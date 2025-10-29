<template>
  <div class="bill-form">
    <div class="bill-form__row">
      <div class="bill-form__field">
        <label>Bill Number</label>
        <BaseInput v-model="localData.billNo" placeholder="Bill No" />
      </div>
      <div class="bill-form__field">
        <label>Supplier</label>
        <BaseInput v-model="localData.supplier" placeholder="Supplier Name" />
      </div>
    </div>
    <div class="bill-form__row">
      <div class="bill-form__field">
        <label>Bill Date</label>
        <BaseDateInput v-model="localData.billDate" />
      </div>
      <div class="bill-form__field">
        <label>Due Date</label>
        <BaseDateInput v-model="localData.dueDate" />
      </div>
    </div>
    <div class="bill-form__field">
      <label>Account</label>
      <BaseInput v-model="localData.account" placeholder="Account" />
    </div>
    <div class="bill-form__field">
      <label>Description</label>
      <BaseInput v-model="localData.lineDescription" placeholder="Description" />
    </div>
    <div class="bill-form__row">
      <div class="bill-form__field">
        <label>Amount</label>
        <BaseInput v-model.number="localData.lineAmount" type="number" placeholder="0.00" />
      </div>
      <div class="bill-form__field">
        <label>Currency</label>
        <BaseInput v-model="localData.currency" placeholder="USD" />
      </div>
    </div>
    <div class="bill-form__field">
      <label>Terms (Optional)</label>
      <BaseInput v-model="localData.terms" placeholder="e.g., Net 30" />
    </div>
    <div class="bill-form__actions">
      <BaseButton @click="$emit('cancel')">Cancel</BaseButton>
      <BaseButton variant="primary" @click="handleSave">Save</BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseInput from '../atoms/BaseInput.vue';
import BaseDateInput from '../atoms/BaseDateInput.vue';
import BaseButton from '../atoms/BaseButton.vue';

const props = defineProps<{
  initialData?: {
    billNo: string;
    supplier: string;
    billDate: string;
    dueDate: string;
    account: string;
    lineDescription: string;
    lineAmount: number;
    terms?: string;
    location?: string;
    memo?: string;
    currency?: string;
  };
}>();

const localData = ref({
  billNo: props.initialData?.billNo || '',
  supplier: props.initialData?.supplier || '',
  billDate: props.initialData?.billDate || '',
  dueDate: props.initialData?.dueDate || '',
  account: props.initialData?.account || '',
  lineDescription: props.initialData?.lineDescription || '',
  lineAmount: props.initialData?.lineAmount || 0,
  terms: props.initialData?.terms || '',
  location: props.initialData?.location || '',
  memo: props.initialData?.memo || '',
  currency: props.initialData?.currency || 'USD',
});

watch(() => props.initialData, (newData) => {
  if (newData) {
    localData.value = { ...newData };
  }
}, { deep: true });

const handleSave = () => {
  emit('save', localData.value);
};

const emit = defineEmits<{
  save: [data: typeof localData.value];
  cancel: [];
}>();
</script>

<style scoped>
.bill-form {
  padding: 1rem;
}

.bill-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.bill-form__field {
  margin-bottom: 1rem;
}

.bill-form__field label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
}

.bill-form__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
</style>


