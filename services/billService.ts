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
    if (uncommittedEvents.length > 0) {
      await this.eventStore.appendEvents(uncommittedEvents);
      bill.markAllEventsAsCommitted();
    }

    return bill;
  }

  /**
   * Get all bills
   */
  async getAllBills(): Promise<BillProjection[]> {
    return await db.getAllBills();
  }

  /**
   * Get a bill by ID
   */
  async getBillById(id: string): Promise<BillProjection | undefined> {
    return await db.getBillById(id);
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
}

export const billService = new BillService();


