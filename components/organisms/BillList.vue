<template>
  <div class="bill-list">
    <div class="bill-list__header">
      <div class="bill-list__header-left">
        <BaseCheckbox
          v-if="filteredBills.length > 0"
          :model-value="isAllSelected"
          :indeterminate="isIndeterminate"
          @update:model-value="toggleSelectAll"
        />
        <h2>Bills</h2>
      </div>
      <div class="bill-list__header-right">
        <label class="bill-list__filter">
          <BaseCheckbox
            :model-value="filterNewOnly"
            @update:model-value="filterNewOnly = $event"
          />
          <span>New only</span>
        </label>
        <BaseButton 
          variant="primary" 
          size="small" 
          :disabled="selectedBills.size === 0"
          @click="exportSelectedBills"
        >
          Export
        </BaseButton>
      </div>
    </div>
    <div class="bill-list__content">
      <div v-if="loading" class="bill-list__empty">Loading...</div>
      <div v-else-if="filteredBills.length === 0" class="bill-list__empty">
        <span v-if="filterNewOnly && allBills.length > 0">
          No new bills. Uncheck "New only" to see all bills.
        </span>
        <span v-else>
          No bills yet. Right-click on text in Gmail or Outlook to mark as bill.
        </span>
      </div>
      <BillListItem
        v-for="bill in filteredBills"
        :key="bill.id"
        :bill="bill"
        :selected="selectedBills.has(bill.id)"
        @click="$emit('bill-selected', bill)"
        @toggle-selection="toggleBillSelection(bill.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { billService } from '../../services/billService';
import type { BillProjection } from '../../services/database';
import BillListItem from '../molecules/BillListItem.vue';
import BaseButton from '../atoms/BaseButton.vue';
import BaseCheckbox from '../atoms/BaseCheckbox.vue';

const allBills = ref<BillProjection[]>([]);
const loading = ref(true);
const selectedBills = ref<Set<string>>(new Set());
const filterNewOnly = ref(true);

// Filter bills based on filterNewOnly setting
const filteredBills = computed(() => {
  if (filterNewOnly.value) {
    return allBills.value.filter(bill => !bill.exported);
  }
  return allBills.value;
});

const isAllSelected = computed(() => {
  return filteredBills.value.length > 0 && selectedBills.value.size === filteredBills.value.length;
});

const isIndeterminate = computed(() => {
  const selectedCount = Array.from(selectedBills.value).filter(id => 
    filteredBills.value.some(bill => bill.id === id)
  ).length;
  return selectedCount > 0 && selectedCount < filteredBills.value.length;
});

const toggleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedBills.value = new Set(filteredBills.value.map(bill => bill.id));
  } else {
    // Only clear selection for currently filtered bills
    filteredBills.value.forEach(bill => {
      selectedBills.value.delete(bill.id);
    });
  }
};

const toggleBillSelection = (billId: string) => {
  if (selectedBills.value.has(billId)) {
    selectedBills.value.delete(billId);
  } else {
    selectedBills.value.add(billId);
  }
};

/**
 * Format date to DD/MM/YYYY format
 */
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Escape CSV field value (handles commas, quotes, newlines)
 */
const escapeCSVField = (value: string | number | undefined): string => {
  if (value === undefined || value === null) {
    return '';
  }
  const str = String(value);
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Export selected bills as CSV file
 */
const exportSelectedBills = async () => {
  if (selectedBills.value.size === 0) {
    return;
  }

  try {
    // Get selected bills (from all bills, not just filtered)
    const selectedBillIds = Array.from(selectedBills.value);
    const billsToExport = allBills.value.filter(bill => selectedBillIds.includes(bill.id));

    if (billsToExport.length === 0) {
      return;
    }

    // CSV header row
    const header = '*BillNo,*Supplier,*BillDate,*DueDate,Terms,Location,Memo,*Account,LineDescription,*LineAmount,Currency';

    // CSV data rows
    const rows = billsToExport.map(bill => {
      return [
        escapeCSVField(bill.billNo),
        escapeCSVField(bill.supplier),
        escapeCSVField(formatDate(bill.billDate)),
        escapeCSVField(formatDate(bill.dueDate)),
        escapeCSVField(bill.terms),
        escapeCSVField(bill.location),
        escapeCSVField(bill.memo),
        escapeCSVField(bill.account),
        escapeCSVField(bill.lineDescription),
        escapeCSVField(bill.lineAmount),
        escapeCSVField(bill.currency)
      ].join(',');
    });

    // Combine header and rows
    const csvContent = [header, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bills_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Mark bills as exported
    for (const bill of billsToExport) {
      try {
        await billService.markBillAsExported(bill.id);
      } catch (error) {
        console.error(`Failed to mark bill ${bill.id} as exported:`, error);
      }
    }

    // Clear selection after export
    selectedBills.value.clear();
    
    // Refresh bills to update exported status
    await loadBills();
    
    console.log(`Exported ${billsToExport.length} bill(s) successfully`);
  } catch (error) {
    console.error('Error exporting bills:', error);
    alert('Failed to export bills. Please try again.');
  }
};

const loadBills = async () => {
  loading.value = true;
  try {
    console.log('Loading bills...');
    allBills.value = await billService.getAllBills();
    console.log('Loaded bills:', allBills.value.length, allBills.value);
    // Clear selection when bills are reloaded
    selectedBills.value.clear();
  } catch (error) {
    console.error('Failed to load bills:', error);
    allBills.value = []; // Ensure we have an empty array on error
    selectedBills.value.clear();
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadBills();
  
  // Listen for storage changes to refresh when bills are added from background
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.billsUpdate) {
      console.log('Bills updated, refreshing list...');
      loadBills();
    }
  });
  
  // Listen for messages indicating bills were created
  browser.runtime.onMessage.addListener((message: any) => {
    if (message.type === 'BILL_CREATED' || message.type === 'BILL_UPDATED') {
      console.log('Bill event received, refreshing list...');
      loadBills();
    }
  });
});

defineEmits<{
  'bill-selected': [bill: BillProjection];
}>();

defineExpose({
  refresh: loadBills,
  selectedBills: () => Array.from(selectedBills.value)
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

.bill-list__header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bill-list__filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.875rem;
  color: #666;
}

.bill-list__filter:hover {
  color: #202020;
}

.bill-list__header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

