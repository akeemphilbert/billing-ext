<template>
  <div class="bill-form">
    <div class="bill-form__row">
      <div class="bill-form__field">
        <label>Bill Number</label>
        <BaseInput v-model="localData.billNo" placeholder="Bill No" />
      </div>
      <div class="bill-form__field">
        <label>Supplier</label>
        <a-auto-complete
          v-model:value="localData.supplier"
          :options="vendorOptions"
          placeholder="Supplier Name"
          allow-clear
          :get-popup-container="getPopupContainer"
          @search="handleVendorSearch"
          @select="handleVendorSelect"
          @blur="handleVendorBlur"
        />
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
      <a-auto-complete
        v-model:value="localData.account"
        :options="accountOptions"
        placeholder="Account"
        allow-clear
        :get-popup-container="getPopupContainer"
        @search="handleAccountSearch"
        @select="handleAccountSelect"
        @blur="handleAccountBlur"
      />
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
import { ref, watch, onMounted } from 'vue';
import BaseInput from '../atoms/BaseInput.vue';
import BaseDateInput from '../atoms/BaseDateInput.vue';
import BaseButton from '../atoms/BaseButton.vue';
import { vendorService } from '../../services/vendorService';
import { accountService } from '../../services/accountService';
import type { VendorProjection } from '../../services/database';
import type { AccountProjection } from '../../services/database';

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

// Vendor autocomplete state
const vendors = ref<VendorProjection[]>([]);
const vendorOptions = ref<Array<{ value: string; label: string }>>([]);
const selectedVendor = ref<VendorProjection | null>(null);

// Account autocomplete state
const accounts = ref<AccountProjection[]>([]);
const accountOptions = ref<Array<{ value: string; label: string }>>([]);
const selectedAccount = ref<AccountProjection | null>(null);

// Get popup container for dropdown (render in modal to avoid overflow clipping)
const getPopupContainer = (triggerNode: HTMLElement): HTMLElement => {
  // Find the modal container (not the modal-content which has overflow)
  const modal = triggerNode.closest('.app__modal');
  if (modal) {
    return modal as HTMLElement;
  }
  // Fallback to app container or body
  return triggerNode.closest('.app') || document.body;
};

// Load vendors and accounts on mount
onMounted(async () => {
  try {
    vendors.value = await vendorService.getAllVendors();
    vendorOptions.value = vendors.value.map(v => ({ value: v.name, label: v.name }));
    
    accounts.value = await accountService.getAllAccounts();
    accountOptions.value = accounts.value.map(a => ({ value: a.code || a.name, label: `${a.code || ''} - ${a.name}`.trim() }));
    
    // Set initial selected vendor/account if provided
    if (props.initialData?.supplier) {
      const vendor = vendors.value.find(v => v.name === props.initialData?.supplier);
      if (vendor) {
        selectedVendor.value = vendor;
      }
    }
    
    if (props.initialData?.account) {
      const account = accounts.value.find(a => 
        a.code === props.initialData?.account || a.name === props.initialData?.account
      );
      if (account) {
        selectedAccount.value = account;
      }
    }
  } catch (error) {
    console.error('Failed to load vendors or accounts:', error);
  }
});

// Vendor autocomplete handlers
const handleVendorSearch = (value: string) => {
  // Filter options based on search value
  if (!value) {
    vendorOptions.value = vendors.value.map(v => ({ value: v.name, label: v.name }));
    return;
  }
  
  const filtered = vendors.value.filter(v => 
    v.name.toLowerCase().includes(value.toLowerCase())
  );
  vendorOptions.value = filtered.map(v => ({ value: v.name, label: v.name }));
  
  // Add "Create new" option if no exact match
  const exactMatch = vendors.value.find(v => 
    v.name.toLowerCase() === value.toLowerCase()
  );
  if (!exactMatch && value.trim()) {
    vendorOptions.value.push({ value: value, label: `Create "${value}"` });
  }
};

const handleVendorSelect = async (value: string) => {
  const vendor = vendors.value.find(v => v.name === value);
  if (vendor) {
    selectedVendor.value = vendor;
    localData.value.supplier = value;
  } else {
    // "Create new" was selected, create vendor immediately
    localData.value.supplier = value;
    await handleVendorBlur();
  }
};

const handleVendorBlur = async () => {
  const supplierValue = localData.value.supplier?.trim();
  if (!supplierValue) {
    selectedVendor.value = null;
    return;
  }
  
  // Check if vendor exists
  const existingVendor = vendors.value.find(v => 
    v.name.toLowerCase() === supplierValue.toLowerCase()
  );
  
  if (!existingVendor) {
    // Create new vendor
    try {
      const newVendor = await vendorService.createVendor({ name: supplierValue });
      vendors.value.push({
        id: newVendor.id,
        name: newVendor.name,
        email: newVendor.email,
        phone: newVendor.phone,
        address: newVendor.address,
        taxId: newVendor.taxId,
        notes: newVendor.notes,
        created_at: newVendor.createdAt.toISOString(),
        updated_at: newVendor.updatedAt.toISOString(),
        deleted: newVendor.deleted,
      });
      selectedVendor.value = vendors.value[vendors.value.length - 1];
      // Refresh options
      vendorOptions.value = vendors.value.map(v => ({ value: v.name, label: v.name }));
    } catch (error) {
      console.error('Failed to create vendor:', error);
    }
  } else {
    selectedVendor.value = existingVendor;
  }
};

// Account autocomplete handlers
const handleAccountSearch = (value: string) => {
  // Filter options based on search value
  if (!value) {
    accountOptions.value = accounts.value.map(a => ({ 
      value: a.code || a.name, 
      label: `${a.code || ''} - ${a.name}`.trim() 
    }));
    return;
  }
  
  const filtered = accounts.value.filter(a => 
    a.code?.toLowerCase().includes(value.toLowerCase()) ||
    a.name.toLowerCase().includes(value.toLowerCase())
  );
  accountOptions.value = filtered.map(a => ({ 
    value: a.code || a.name, 
    label: `${a.code || ''} - ${a.name}`.trim() 
  }));
  
  // Add "Create new" option if no exact match
  const exactMatch = accounts.value.find(a => 
    a.code?.toLowerCase() === value.toLowerCase() ||
    a.name.toLowerCase() === value.toLowerCase()
  );
  if (!exactMatch && value.trim()) {
    accountOptions.value.push({ value: value, label: `Create "${value}"` });
  }
};

const handleAccountSelect = async (value: string) => {
  const account = accounts.value.find(a => 
    (a.code || a.name) === value
  );
  if (account) {
    selectedAccount.value = account;
    localData.value.account = value;
  } else {
    // "Create new" was selected, create account immediately
    localData.value.account = value;
    await handleAccountBlur();
  }
};

const handleAccountBlur = async () => {
  const accountValue = localData.value.account?.trim();
  if (!accountValue) {
    selectedAccount.value = null;
    return;
  }
  
  // Check if account exists
  const existingAccount = accounts.value.find(a => 
    a.code?.toLowerCase() === accountValue.toLowerCase() ||
    a.name.toLowerCase() === accountValue.toLowerCase()
  );
  
  if (!existingAccount) {
    // Create new account
    try {
      // Try to parse as "code - name" or use value as both code and name
      const parts = accountValue.split(' - ');
      const code = parts.length > 1 ? parts[0].trim() : accountValue;
      const name = parts.length > 1 ? parts.slice(1).join(' - ').trim() : accountValue;
      
      const newAccount = await accountService.createAccount({ 
        code, 
        name 
      });
      accounts.value.push({
        id: newAccount.id,
        code: newAccount.code,
        name: newAccount.name,
        description: newAccount.description,
        accountType: newAccount.accountType,
        created_at: newAccount.createdAt.toISOString(),
        updated_at: newAccount.updatedAt.toISOString(),
        deleted: newAccount.deleted,
      });
      selectedAccount.value = accounts.value[accounts.value.length - 1];
      // Refresh options
      accountOptions.value = accounts.value.map(a => ({ 
        value: a.code || a.name, 
        label: `${a.code || ''} - ${a.name}`.trim() 
      }));
      localData.value.account = code || name;
    } catch (error) {
      console.error('Failed to create account:', error);
    }
  } else {
    selectedAccount.value = existingAccount;
    localData.value.account = existingAccount.code || existingAccount.name;
  }
};

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


