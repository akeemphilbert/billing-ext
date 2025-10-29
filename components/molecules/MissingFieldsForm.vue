<template>
  <div class="missing-fields-form">
    <h3 class="missing-fields-form__title">Please provide missing information</h3>
    <p class="missing-fields-form__subtitle">Some required fields were not found in the email. Please fill them in below.</p>
    
    <div class="missing-fields-form__fields">
      <template v-for="field in missingFields" :key="field.fieldName">
        <div v-if="field.fieldType === 'date'" class="missing-fields-form__field">
          <label>{{ field.displayLabel }} <span class="required">*</span></label>
          <BaseDateInput 
            v-model="formData[field.fieldName as keyof typeof formData]" 
          />
        </div>
        <div v-else-if="field.fieldType === 'number'" class="missing-fields-form__field">
          <label>{{ field.displayLabel }} <span class="required">*</span></label>
          <BaseInput 
            v-model="formData[field.fieldName as keyof typeof formData]" 
            type="number"
            :placeholder="getPlaceholder(field.fieldName)"
          />
        </div>
        <div v-else class="missing-fields-form__field">
          <label>{{ field.displayLabel }} <span class="required">*</span></label>
          <BaseInput 
            v-model="formData[field.fieldName as keyof typeof formData]" 
            :placeholder="getPlaceholder(field.fieldName)"
          />
        </div>
      </template>
    </div>

    <div class="missing-fields-form__actions">
      <BaseButton @click="handleCancel">Cancel</BaseButton>
      <BaseButton variant="primary" @click="handleSubmit">Submit</BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseInput from '../atoms/BaseInput.vue';
import BaseDateInput from '../atoms/BaseDateInput.vue';
import BaseButton from '../atoms/BaseButton.vue';
import type { MissingFieldInfo } from '../../services/promptApiService';
import type { BillExtractionResult } from '../../services/promptApiService';

interface Props {
  missingFields: MissingFieldInfo[];
  extractedData: Partial<BillExtractionResult>;
}

const props = defineProps<Props>();

// Initialize form data with existing values or empty strings
const formData = ref<Record<string, string | number>>({});

// Set initial values for missing fields
props.missingFields.forEach(field => {
  const existingValue = props.extractedData[field.fieldName as keyof typeof props.extractedData];
  if (field.fieldType === 'number') {
    formData.value[field.fieldName] = existingValue || 0;
  } else {
    formData.value[field.fieldName] = existingValue?.toString() || '';
  }
});

const getPlaceholder = (fieldName: string): string => {
  const placeholders: Record<string, string> = {
    supplier: 'Supplier Name',
    account: 'Account',
    billDate: 'YYYY-MM-DD',
    dueDate: 'YYYY-MM-DD',
    lineAmount: '0.00',
  };
  return placeholders[fieldName] || '';
};

const handleSubmit = () => {
  // Validate all fields are filled
  for (const field of props.missingFields) {
    if (field.fieldType === 'number') {
      const value = formData.value[field.fieldName];
      if (value === undefined || value === null || value === '' || Number(value) <= 0) {
        alert(`${field.displayLabel} is required and must be greater than 0`);
        return;
      }
    } else {
      const value = formData.value[field.fieldName];
      if (!value || value.toString().trim() === '') {
        alert(`${field.displayLabel} is required`);
        return;
      }
    }
  }

  // Emit the form data merged with extracted data
  emit('submit', formData.value);
};

const handleCancel = () => {
  emit('cancel');
};

const emit = defineEmits<{
  submit: [data: Record<string, string | number>];
  cancel: [];
}>();
</script>

<style scoped>
.missing-fields-form {
  padding: 1.5rem;
}

.missing-fields-form__title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #202020;
}

.missing-fields-form__subtitle {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  color: #666;
  line-height: 1.5;
}

.missing-fields-form__fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.missing-fields-form__field {
  display: flex;
  flex-direction: column;
}

.missing-fields-form__field label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
}

.missing-fields-form__field .required {
  color: #dc4c3e;
}

.missing-fields-form__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>

