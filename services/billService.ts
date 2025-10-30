import { Bill } from '../domain/bill/Bill';
import { useEventStore } from '../stores/eventStore';
import { db, type BillProjection } from './database';
import { v4 as uuidv4 } from 'uuid';

class BillService {
  private eventStore = useEventStore();

  /**
   * Create a new bill
   */
  async createBill(data: {
    billNo: string;
    supplier: string;
    billDate: Date;
    dueDate: Date;
    account: string;
    lineDescription: string;
    lineAmount: number;
    terms?: string;
    location?: string;
    memo?: string;
    currency?: string;
  }): Promise<Bill> {
    try {
      const id = uuidv4();
      const bill = Bill.create(
        id,
        data.billNo,
        data.supplier,
        data.billDate,
        data.dueDate,
        data.account,
        data.lineDescription,
        data.lineAmount,
        data.terms,
        data.location,
        data.memo,
        data.currency
      );

      // Get uncommitted events and store them
      const uncommittedEvents = bill.getAllUncommittedEvents();
      console.log('Uncommitted events:', uncommittedEvents);
      
      if (uncommittedEvents.length > 0) {
        await this.eventStore.appendEvents(uncommittedEvents);
        bill.markAllEventsAsCommitted();
        console.log('Bill created and saved successfully');
      } else {
        console.warn('No uncommitted events to save');
      }

      return bill;
    } catch (error) {
      console.error('Error creating bill:', error);
      throw error;
    }
  }

  /**
   * Get all bills
   */
  async getAllBills(): Promise<BillProjection[]> {
    try {
      // Ensure database is open before querying
      await db.open();
      const bills = await db.getAllBills();
      console.log('Retrieved bills:', bills.length);
      return bills;
    } catch (error) {
      console.error('Error getting all bills:', error);
      throw error;
    }
  }

  /**
   * Get a bill by ID
   */
  async getBillById(id: string): Promise<BillProjection | undefined> {
    try {
      await db.open();
      return await db.getBillById(id);
    } catch (error) {
      console.error('Error getting bill by ID:', error);
      throw error;
    }
  }

  /**
   * Update a bill
   */
  async updateBill(id: string, updates: {
    billNo?: string;
    supplier?: string;
    billDate?: Date;
    dueDate?: Date;
    terms?: string;
    location?: string;
    memo?: string;
    account?: string;
    lineDescription?: string;
    lineAmount?: number;
    currency?: string;
  }): Promise<void> {
    // Get events for this aggregate
    const events = await this.eventStore.getEventsByAggregateId(id);
    const bill = Bill.fromEvents(id, events);

    // Update the bill
    bill.updateMetadata(updates);

    // Store new events
    const uncommittedEvents = bill.getAllUncommittedEvents();
    if (uncommittedEvents.length > 0) {
      await this.eventStore.appendEvents(uncommittedEvents);
      bill.markAllEventsAsCommitted();
    }
  }

  /**
   * Delete a bill
   */
  async deleteBill(id: string): Promise<void> {
    // Get events for this aggregate
    const events = await this.eventStore.getEventsByAggregateId(id);
    const bill = Bill.fromEvents(id, events);

    // Delete the bill
    bill.delete();

    // Store the delete event
    const uncommittedEvents = bill.getAllUncommittedEvents();
    if (uncommittedEvents.length > 0) {
      await this.eventStore.appendEvents(uncommittedEvents);
      bill.markAllEventsAsCommitted();
    }
  }

  /**
   * Mark a bill as exported
   */
  async markBillAsExported(id: string): Promise<void> {
    // Get events for this aggregate
    const events = await this.eventStore.getEventsByAggregateId(id);
    const bill = Bill.fromEvents(id, events);

    // Mark the bill as exported
    bill.markAsExported();

    // Store the exported event
    const uncommittedEvents = bill.getAllUncommittedEvents();
    if (uncommittedEvents.length > 0) {
      await this.eventStore.appendEvents(uncommittedEvents);
      bill.markAllEventsAsCommitted();
    }
  }
}

export const billService = new BillService();


