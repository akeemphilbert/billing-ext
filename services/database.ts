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

// Define the database schema
export class BillingDatabase extends Dexie {
  // Event stores
  billEvents!: Table<DomainEvent>;
  
  // Projection stores
  billProjections!: Table<BillProjection>;

  constructor() {
    super('BillingDatabase');
    
    this.version(1).stores({
      // Event stores with indexes for efficient querying
      billEvents: '++id, aggregateId, type, sequenceNo, timestamp',
      
      // Projection stores with indexes for queries
      // Note: We don't index 'deleted' to avoid schema complexity - we'll filter in memory
      billProjections: 'id, billNo, supplier, account, created_at',
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
   * Clear all data from the database (useful for development/testing)
   */
  async clearAllData(): Promise<void> {
    console.log('Clearing all database data...');
    await this.billEvents.clear();
    await this.billProjections.clear();
    console.log('Database cleared successfully');
  }
}

// Export singleton database instance
export const db = new BillingDatabase();
