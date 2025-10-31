import Dexie, { Table } from 'dexie';
import { DomainEvent } from '../domain/common/DomainEvent';

// Define interfaces for projections
export interface BillProjection {
  id: string;
  billNo: string;
  supplier: string;
  billDate: string;
  dueDate: string;
  terms?: string;
  location?: string;
  memo?: string;
  account: string;
  lineDescription: string;
  lineAmount: number;
  currency?: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  exported: boolean;
}

export interface VendorProjection {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface AccountProjection {
  id: string;
  code: string;
  name: string;
  description?: string;
  accountType?: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

// Define the database schema
export class BillingDatabase extends Dexie {
  // Event store (unified for all entities)
  events!: Table<DomainEvent>;
  
  // Projection stores
  billProjections!: Table<BillProjection>;
  vendorProjections!: Table<VendorProjection>;
  accountProjections!: Table<AccountProjection>;

  constructor() {
    super('BillingDatabase');
    
    // Version 1: Original schema with bills only
    this.version(1).stores({
      billEvents: '++id, aggregateId, type, sequenceNo, timestamp',
      billProjections: 'id, billNo, supplier, account, created_at',
    });

    // Version 2: Added vendors
    this.version(2).stores({
      billEvents: '++id, aggregateId, type, sequenceNo, timestamp',
      vendorEvents: '++id, aggregateId, type, sequenceNo, timestamp',
      billProjections: 'id, billNo, supplier, account, created_at',
      vendorProjections: 'id, name, created_at',
    });

    // Version 3: Added accounts
    this.version(3).stores({
      billEvents: '++id, aggregateId, type, sequenceNo, timestamp',
      vendorEvents: '++id, aggregateId, type, sequenceNo, timestamp',
      accountEvents: '++id, aggregateId, type, sequenceNo, timestamp',
      billProjections: 'id, billNo, supplier, account, created_at',
      vendorProjections: 'id, name, created_at',
      accountProjections: 'id, code, name, created_at',
    });

    // Version 4: Consolidated all events into a single table
    this.version(4).stores({
      events: '++id, aggregateId, type, sequenceNo, timestamp',
      billProjections: 'id, billNo, supplier, account, created_at',
      vendorProjections: 'id, name, created_at',
      accountProjections: 'id, code, name, created_at',
    }).upgrade(async (trans) => {
      // Migrate existing events to unified table
      // Check if old tables exist before trying to read from them
      const allEvents: DomainEvent[] = [];
      
      try {
        if (trans.table('billEvents')) {
          const billEvents = await trans.table('billEvents').toArray();
          allEvents.push(...billEvents);
        }
      } catch (e) {
        // Table doesn't exist, skip
      }
      
      try {
        if (trans.table('vendorEvents')) {
          const vendorEvents = await trans.table('vendorEvents').toArray();
          allEvents.push(...vendorEvents);
        }
      } catch (e) {
        // Table doesn't exist, skip
      }
      
      try {
        if (trans.table('accountEvents')) {
          const accountEvents = await trans.table('accountEvents').toArray();
          allEvents.push(...accountEvents);
        }
      } catch (e) {
        // Table doesn't exist, skip
      }
      
      if (allEvents.length > 0) {
        await trans.table('events').bulkAdd(allEvents);
      }
    });
  }
  
  /**
   * Update bill projection based on domain event
   * @param event The domain event that occurred
   */
  async updateBillProjection(event: DomainEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'bill.created':
          await this.handleBillCreated(event);
          break;
        case 'bill.updated':
          await this.handleBillUpdated(event);
          break;
        case 'bill.deleted':
          await this.handleBillDeleted(event);
          break;
        case 'bill.exported':
          await this.handleBillExported(event);
          break;
      }
    } catch (error) {
      console.error('Error updating bill projection:', error);
    }
  }
  
  /**
   * Handle BillCreated events
   */
  private async handleBillCreated(event: DomainEvent): Promise<void> {
    console.log('Handling BillCreated event:', event);
    const billData = event.data as any;
    console.log('Bill data:', billData);
    
    // Helper to convert date to ISO string (handles both Date objects and ISO strings)
    const toISOString = (date: any): string => {
      if (!date) return new Date().toISOString();
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'string') {
        // If already a string, validate it's ISO format, otherwise try to parse
        try {
          return new Date(date).toISOString();
        } catch {
          return date;
        }
      }
      return new Date().toISOString();
    };
    
    const projection: BillProjection = {
      id: event.aggregateId, // Use aggregateId from event
      billNo: billData.billNo || '',
      supplier: billData.supplier || '',
      billDate: toISOString(billData.billDate),
      dueDate: toISOString(billData.dueDate),
      terms: billData.terms,
      location: billData.location,
      memo: billData.memo,
      account: billData.account || '',
      lineDescription: billData.lineDescription || '',
      lineAmount: billData.lineAmount || 0,
      currency: billData.currency,
      created_at: toISOString(billData.createdAt),
      updated_at: toISOString(billData.updatedAt),
      deleted: billData.deleted || false,
      exported: billData.exported || false,
    };
    
    console.log('Creating projection:', projection);
    await this.billProjections.add(projection);
    console.log('Projection created successfully');
  }
  
  /**
   * Handle BillUpdated events
   */
  private async handleBillUpdated(event: DomainEvent): Promise<void> {
    const billData = event.data as any;
    const existingProjection = await this.billProjections.get(event.aggregateId);
    
    // Helper to convert date to ISO string (handles both Date objects and ISO strings)
    const toISOString = (date: any): string => {
      if (!date) return new Date().toISOString();
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'string') {
        try {
          return new Date(date).toISOString();
        } catch {
          return date;
        }
      }
      return new Date().toISOString();
    };
    
    if (existingProjection) {
      const updatedProjection: BillProjection = {
        ...existingProjection,
        billNo: billData.billNo !== undefined ? billData.billNo : existingProjection.billNo,
        supplier: billData.supplier !== undefined ? billData.supplier : existingProjection.supplier,
        billDate: billData.billDate !== undefined ? toISOString(billData.billDate) : existingProjection.billDate,
        dueDate: billData.dueDate !== undefined ? toISOString(billData.dueDate) : existingProjection.dueDate,
        terms: billData.terms !== undefined ? billData.terms : existingProjection.terms,
        location: billData.location !== undefined ? billData.location : existingProjection.location,
        memo: billData.memo !== undefined ? billData.memo : existingProjection.memo,
        account: billData.account !== undefined ? billData.account : existingProjection.account,
        lineDescription: billData.lineDescription !== undefined ? billData.lineDescription : existingProjection.lineDescription,
        lineAmount: billData.lineAmount !== undefined ? billData.lineAmount : existingProjection.lineAmount,
        currency: billData.currency !== undefined ? billData.currency : existingProjection.currency,
        updated_at: billData.updatedAt !== undefined ? toISOString(billData.updatedAt) : new Date().toISOString(),
        exported: billData.exported !== undefined ? billData.exported : existingProjection.exported,
      };
      
      await this.billProjections.put(updatedProjection);
    }
  }
  
  /**
   * Handle BillDeleted events
   */
  private async handleBillDeleted(event: DomainEvent): Promise<void> {
    await this.billProjections.delete(event.aggregateId);
  }

  /**
   * Handle BillExported events
   */
  private async handleBillExported(event: DomainEvent): Promise<void> {
    const billData = event.data as any;
    const existingProjection = await this.billProjections.get(event.aggregateId);
    
    const toISOString = (date: any): string => {
      if (!date) return new Date().toISOString();
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'string') {
        try {
          return new Date(date).toISOString();
        } catch {
          return date;
        }
      }
      return new Date().toISOString();
    };
    
    if (existingProjection) {
      const updatedProjection: BillProjection = {
        ...existingProjection,
        exported: true,
        updated_at: billData.updatedAt !== undefined ? toISOString(billData.updatedAt) : new Date().toISOString(),
      };
      
      await this.billProjections.put(updatedProjection);
    }
  }

  /**
   * Get all bills
   * @returns Array of bill projections
   */
  async getAllBills(): Promise<BillProjection[]> {
    try {
      // Ensure database is open
      if (!this.isOpen()) {
        await this.open();
      }
      
      // Get all bills and filter out deleted ones in memory
      // This avoids needing an index on 'deleted' and is simpler
      const allBills = await this.billProjections.toArray();
      const activeBills = allBills.filter(bill => !bill.deleted || bill.deleted === false);
      console.log('Database getAllBills: found', activeBills.length, 'active bills out of', allBills.length, 'total');
      return activeBills;
    } catch (error) {
      console.error('Error in database getAllBills:', error);
      // Return empty array on error rather than throwing, to prevent UI crashes
      return [];
    }
  }

  /**
   * Get a bill by ID
   * @param id The bill ID
   * @returns Bill projection or undefined
   */
  async getBillById(id: string): Promise<BillProjection | undefined> {
    return await this.billProjections.get(id);
  }

  /**
   * Update vendor projection based on domain event
   * @param event The domain event that occurred
   */
  async updateVendorProjection(event: DomainEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'vendor.created':
          await this.handleVendorCreated(event);
          break;
        case 'vendor.updated':
          await this.handleVendorUpdated(event);
          break;
        case 'vendor.deleted':
          await this.handleVendorDeleted(event);
          break;
      }
    } catch (error) {
      console.error('Error updating vendor projection:', error);
    }
  }

  /**
   * Handle VendorCreated events
   */
  private async handleVendorCreated(event: DomainEvent): Promise<void> {
    console.log('Handling VendorCreated event:', event);
    const vendorData = event.data as any;
    
    const toISOString = (date: any): string => {
      if (!date) return new Date().toISOString();
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'string') {
        try {
          return new Date(date).toISOString();
        } catch {
          return date;
        }
      }
      return new Date().toISOString();
    };
    
    const projection: VendorProjection = {
      id: event.aggregateId,
      name: vendorData.name || '',
      email: vendorData.email,
      phone: vendorData.phone,
      address: vendorData.address,
      taxId: vendorData.taxId,
      notes: vendorData.notes,
      created_at: toISOString(vendorData.createdAt),
      updated_at: toISOString(vendorData.updatedAt),
      deleted: vendorData.deleted || false,
    };
    
    console.log('Creating vendor projection:', projection);
    await this.vendorProjections.add(projection);
    console.log('Vendor projection created successfully');
  }

  /**
   * Handle VendorUpdated events
   */
  private async handleVendorUpdated(event: DomainEvent): Promise<void> {
    const vendorData = event.data as any;
    const existingProjection = await this.vendorProjections.get(event.aggregateId);
    
    const toISOString = (date: any): string => {
      if (!date) return new Date().toISOString();
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'string') {
        try {
          return new Date(date).toISOString();
        } catch {
          return date;
        }
      }
      return new Date().toISOString();
    };
    
    if (existingProjection) {
      const updatedProjection: VendorProjection = {
        ...existingProjection,
        name: vendorData.name !== undefined ? vendorData.name : existingProjection.name,
        email: vendorData.email !== undefined ? vendorData.email : existingProjection.email,
        phone: vendorData.phone !== undefined ? vendorData.phone : existingProjection.phone,
        address: vendorData.address !== undefined ? vendorData.address : existingProjection.address,
        taxId: vendorData.taxId !== undefined ? vendorData.taxId : existingProjection.taxId,
        notes: vendorData.notes !== undefined ? vendorData.notes : existingProjection.notes,
        updated_at: vendorData.updatedAt !== undefined ? toISOString(vendorData.updatedAt) : new Date().toISOString(),
      };
      
      await this.vendorProjections.put(updatedProjection);
    }
  }

  /**
   * Handle VendorDeleted events
   */
  private async handleVendorDeleted(event: DomainEvent): Promise<void> {
    await this.vendorProjections.delete(event.aggregateId);
  }

  /**
   * Get all vendors
   * @returns Array of vendor projections
   */
  async getAllVendors(): Promise<VendorProjection[]> {
    try {
      if (!this.isOpen()) {
        await this.open();
      }
      
      const allVendors = await this.vendorProjections.toArray();
      const activeVendors = allVendors.filter(vendor => !vendor.deleted || vendor.deleted === false);
      console.log('Database getAllVendors: found', activeVendors.length, 'active vendors out of', allVendors.length, 'total');
      return activeVendors;
    } catch (error) {
      console.error('Error in database getAllVendors:', error);
      return [];
    }
  }

  /**
   * Get a vendor by ID
   * @param id The vendor ID
   * @returns Vendor projection or undefined
   */
  async getVendorById(id: string): Promise<VendorProjection | undefined> {
    return await this.vendorProjections.get(id);
  }

  /**
   * Get a vendor by name (case-insensitive)
   * @param name The vendor name
   * @returns Vendor projection or undefined
   */
  async getVendorByName(name: string): Promise<VendorProjection | undefined> {
    try {
      if (!this.isOpen()) {
        await this.open();
      }
      
      const allVendors = await this.vendorProjections.toArray();
      const vendor = allVendors.find(
        v => !v.deleted && v.name.toLowerCase() === name.toLowerCase()
      );
      return vendor;
    } catch (error) {
      console.error('Error in database getVendorByName:', error);
      return undefined;
    }
  }

  /**
   * Update account projection based on domain event
   * @param event The domain event that occurred
   */
  async updateAccountProjection(event: DomainEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'account.created':
          await this.handleAccountCreated(event);
          break;
        case 'account.updated':
          await this.handleAccountUpdated(event);
          break;
        case 'account.deleted':
          await this.handleAccountDeleted(event);
          break;
      }
    } catch (error) {
      console.error('Error updating account projection:', error);
    }
  }

  /**
   * Handle AccountCreated events
   */
  private async handleAccountCreated(event: DomainEvent): Promise<void> {
    console.log('Handling AccountCreated event:', event);
    const accountData = event.data as any;
    
    const toISOString = (date: any): string => {
      if (!date) return new Date().toISOString();
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'string') {
        try {
          return new Date(date).toISOString();
        } catch {
          return date;
        }
      }
      return new Date().toISOString();
    };
    
    const projection: AccountProjection = {
      id: event.aggregateId,
      code: accountData.code || '',
      name: accountData.name || '',
      description: accountData.description,
      accountType: accountData.accountType,
      created_at: toISOString(accountData.createdAt),
      updated_at: toISOString(accountData.updatedAt),
      deleted: accountData.deleted || false,
    };
    
    console.log('Creating account projection:', projection);
    await this.accountProjections.add(projection);
    console.log('Account projection created successfully');
  }

  /**
   * Handle AccountUpdated events
   */
  private async handleAccountUpdated(event: DomainEvent): Promise<void> {
    const accountData = event.data as any;
    const existingProjection = await this.accountProjections.get(event.aggregateId);
    
    const toISOString = (date: any): string => {
      if (!date) return new Date().toISOString();
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'string') {
        try {
          return new Date(date).toISOString();
        } catch {
          return date;
        }
      }
      return new Date().toISOString();
    };
    
    if (existingProjection) {
      const updatedProjection: AccountProjection = {
        ...existingProjection,
        code: accountData.code !== undefined ? accountData.code : existingProjection.code,
        name: accountData.name !== undefined ? accountData.name : existingProjection.name,
        description: accountData.description !== undefined ? accountData.description : existingProjection.description,
        accountType: accountData.accountType !== undefined ? accountData.accountType : existingProjection.accountType,
        updated_at: accountData.updatedAt !== undefined ? toISOString(accountData.updatedAt) : new Date().toISOString(),
      };
      
      await this.accountProjections.put(updatedProjection);
    }
  }

  /**
   * Handle AccountDeleted events
   */
  private async handleAccountDeleted(event: DomainEvent): Promise<void> {
    await this.accountProjections.delete(event.aggregateId);
  }

  /**
   * Get all accounts
   * @returns Array of account projections
   */
  async getAllAccounts(): Promise<AccountProjection[]> {
    try {
      if (!this.isOpen()) {
        await this.open();
      }
      
      const allAccounts = await this.accountProjections.toArray();
      const activeAccounts = allAccounts.filter(account => !account.deleted || account.deleted === false);
      console.log('Database getAllAccounts: found', activeAccounts.length, 'active accounts out of', allAccounts.length, 'total');
      return activeAccounts;
    } catch (error) {
      console.error('Error in database getAllAccounts:', error);
      return [];
    }
  }

  /**
   * Get an account by ID
   * @param id The account ID
   * @returns Account projection or undefined
   */
  async getAccountById(id: string): Promise<AccountProjection | undefined> {
    return await this.accountProjections.get(id);
  }

  /**
   * Get an account by code (case-insensitive)
   * @param code The account code
   * @returns Account projection or undefined
   */
  async getAccountByCode(code: string): Promise<AccountProjection | undefined> {
    try {
      if (!this.isOpen()) {
        await this.open();
      }
      
      const allAccounts = await this.accountProjections.toArray();
      const account = allAccounts.find(
        a => !a.deleted && a.code.toLowerCase() === code.toLowerCase()
      );
      return account;
    } catch (error) {
      console.error('Error in database getAccountByCode:', error);
      return undefined;
    }
  }

  /**
   * Clear all data from the database (useful for development/testing)
   */
  async clearAllData(): Promise<void> {
    console.log('Clearing all database data...');
    await this.events.clear();
    await this.billProjections.clear();
    await this.vendorProjections.clear();
    await this.accountProjections.clear();
    console.log('Database cleared successfully');
  }
}

// Export singleton database instance
export const db = new BillingDatabase();
