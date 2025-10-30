<template>
  <div class="app">
    <div class="app__header">
      <h1>Billing Extension</h1>
    </div>
    <div class="app__content">
      <BillList
        v-if="!selectedBill"
        ref="billListRef"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BillList from '../../components/organisms/BillList.vue';
import BillDetail from '../../components/organisms/BillDetail.vue';
import BillForm from '../../components/molecules/BillForm.vue';
import { billService } from '../../services/billService';
import { useEventStore } from '../../stores/eventStore';
import { db } from '../../services/database';
import type { BillProjection } from '../../services/database';

const selectedBill = ref<BillProjection | null>(null);
const showCreateForm = ref(false);
const billListRef = ref<any>(null);
const eventStore = useEventStore();

// Initialize event store and database on mount
onMounted(async () => {
  try {
    // Ensure database is open
    await db.open();
    // Initialize event store
    await eventStore.initialize();
    console.log('Billing extension initialized');
  } catch (error) {
    console.error('Failed to initialize billing extension:', error);
  }
});

const handleCreateBill = async (data: any) => {
  try {
    await billService.createBill({
      ...data,
      billDate: new Date(data.billDate),
      dueDate: new Date(data.dueDate),
    });
    showCreateForm.value = false;
    selectedBill.value = null;
    if (billListRef.value && typeof billListRef.value.refresh === 'function') {
      billListRef.value.refresh();
    }
  } catch (error) {
    console.error('Failed to create bill:', error);
    alert('Failed to save bill. Please check the console for details.');
  }
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


