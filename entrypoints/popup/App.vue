<template>
  <div class="app">
    <div class="app__header">
      <h1>Billing Extension</h1>
    </div>
    <div class="app__content">
      <MissingFieldsForm
        v-if="showMissingFieldsForm && missingFieldsData"
        :missing-fields="missingFieldsData.missingFields"
        :extracted-data="missingFieldsData.extractedData"
        @submit="handleMissingFieldsSubmit"
        @cancel="handleMissingFieldsCancel"
      />
      <template v-else>
        <BillList
          v-if="!selectedBill"
          @bill-selected="selectedBill = $event"
          @create-bill="showCreateForm = true"
        />
        <BillDetail
          v-else
          :bill="selectedBill"
          @close="selectedBill = null"
        />
        <div v-if="showCreateForm" class="app__modal">
          <div class="app__modal-content">
            <BillForm @save="handleCreateBill" @cancel="showCreateForm = false" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BillList from '../../components/organisms/BillList.vue';
import BillDetail from '../../components/organisms/BillDetail.vue';
import BillForm from '../../components/molecules/BillForm.vue';
import MissingFieldsForm from '../../components/molecules/MissingFieldsForm.vue';
import { billService } from '../../services/billService';
import type { BillProjection } from '../../services/database';
import type { MissingFieldInfo, BillExtractionResult } from '../../services/promptApiService';

const selectedBill = ref<BillProjection | null>(null);
const showCreateForm = ref(false);
const showMissingFieldsForm = ref(false);
const missingFieldsData = ref<{
  missingFields: MissingFieldInfo[];
  extractedData: Partial<BillExtractionResult>;
} | null>(null);

onMounted(() => {
  // Check for pending extraction data
  chrome.storage.local.get('pendingBillExtraction', (result) => {
    if (result.pendingBillExtraction) {
      const data = result.pendingBillExtraction;
      missingFieldsData.value = {
        missingFields: data.missingFields,
        extractedData: data.extractedData,
      };
      showMissingFieldsForm.value = true;
    }
  });

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHOW_MISSING_FIELDS_FORM') {
      missingFieldsData.value = {
        missingFields: message.missingFields,
        extractedData: message.extractedData,
      };
      showMissingFieldsForm.value = true;
      sendResponse({ success: true });
    }
    return true; // Return true for async response
  });
});

const handleCreateBill = async (data: any) => {
  await billService.createBill({
    ...data,
    billDate: new Date(data.billDate),
    dueDate: new Date(data.dueDate),
  });
  showCreateForm.value = false;
  // Refresh the list by closing and reopening
  selectedBill.value = null;
};

const handleMissingFieldsSubmit = async (formData: Record<string, string | number>) => {
  if (!missingFieldsData.value) return;

  // Merge form data with extracted data
  const mergedData = {
    ...missingFieldsData.value.extractedData,
    ...formData,
  };

  // Send data back to content script
  chrome.runtime.sendMessage({
    type: 'MISSING_FIELDS_SUBMITTED',
    data: mergedData,
  });

  showMissingFieldsForm.value = false;
  missingFieldsData.value = null;
};

const handleMissingFieldsCancel = () => {
  chrome.runtime.sendMessage({
    type: 'MISSING_FIELDS_CANCELLED',
  });
  showMissingFieldsForm.value = false;
  missingFieldsData.value = null;
};
</script>

<style scoped>
.app {
  width: 400px;
  height: 600px;
  display: flex;
  flex-direction: column;
}

.app__header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.app__header h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #202020;
}

.app__content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.app__modal {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.app__modal-content {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 90%;
  max-height: 90%;
  overflow-y: auto;
}
</style>


