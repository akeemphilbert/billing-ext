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
    const projection: BillProjection = {
      id: event.aggregateId, // Use aggregateId from event
      billNo: billData.billNo,
      supplier: billData.supplier,
      billDate: billData.billDate instanceof Date ? billData.billDate.toISOString() : billData.billDate,
      dueDate: billData.dueDate instanceof Date ? billData.dueDate.toISOString() : billData.dueDate,
      terms: billData.terms,
      location: billData.location,
      memo: billData.memo,
      account: billData.account,
      lineDescription: billData.lineDescription,
      lineAmount: billData.lineAmount,
      currency: billData.currency,
      created_at: billData.createdAt.toISOString(),
      updated_at: billData.updatedAt.toISOString(),
      deleted: billData.deleted || false,
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
    
    if (existingProjection) {
      const updatedProjection: BillProjection = {
        ...existingProjection,
        billNo: billData.billNo,
        supplier: billData.supplier,
        billDate: billData.billDate instanceof Date ? billData.billDate.toISOString() : billData.billDate,
        dueDate: billData.dueDate instanceof Date ? billData.dueDate.toISOString() : billData.dueDate,
        terms: billData.terms,
        location: billData.location,
        memo: billData.memo,
        account: billData.account,
        lineDescription: billData.lineDescription,
        lineAmount: billData.lineAmount,
        currency: billData.currency,
        updated_at: billData.updatedAt.toISOString(),
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
   * Get all bills
   * @returns Array of bill projections
   */
  async getAllBills(): Promise<BillProjection[]> {
    return await this.billProjections.where('deleted').equals(false).toArray();
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
