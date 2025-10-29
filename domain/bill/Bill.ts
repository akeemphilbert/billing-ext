import { AggregateRoot } from '../common/AggregateRoot';
import { DomainEvent } from '../common/DomainEvent';
import { createDomainEvent } from '../common/DomainEvent';

/**
 * Bill Aggregate Root
 * Represents a bill/invoice with QuickBooks-compatible fields
 */
export class Bill extends AggregateRoot {
  private _billNo: string;
  private _supplier: string;
  private _billDate: Date;
  private _dueDate: Date;
  private _terms?: string;
  private _location?: string;
  private _memo?: string;
  private _account: string;
  private _lineDescription: string;
  private _lineAmount: number;
  private _currency?: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _deleted: boolean;

  /**
   * Private constructor for creating new bills
   */
  constructor(
    id: string,
    billNo: string,
    supplier: string,
    billDate: Date,
    dueDate: Date,
    account: string,
    lineDescription: string,
    lineAmount: number,
    terms?: string,
    location?: string,
    memo?: string,
    currency?: string,
    version: number = 1
  ) {
    super(id, version);
    this._billNo = billNo;
    this._supplier = supplier;
    this._billDate = billDate;
    this._dueDate = dueDate;
    this._account = account;
    this._lineDescription = lineDescription;
    this._lineAmount = lineAmount;
    this._terms = terms;
    this._location = location;
    this._memo = memo;
    this._currency = currency;
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._deleted = false;
  }

  /**
   * Static factory method to create a new bill with event emission
   */
  static create(
    id: string,
    billNo: string,
    supplier: string,
    billDate: Date,
    dueDate: Date,
    account: string,
    lineDescription: string,
    lineAmount: number,
    terms?: string,
    location?: string,
    memo?: string,
    currency?: string
  ): Bill {
    const bill = new Bill(
      id,
      billNo,
      supplier,
      billDate,
      dueDate,
      account,
      lineDescription,
      lineAmount,
      terms,
      location,
      memo,
      currency
    );
    
    const event = createDomainEvent(
      'bill.created',
      bill,
      bill.id,
      bill.sequenceNo + 1
    );
    
    bill.applyEvent(event);
    return bill;
  }

  /**
   * Static factory method to reconstruct a bill from events
   */
  static fromEvents(id: string, events: DomainEvent[]): Bill {
    const bill = new Bill(id, '', '', new Date(), new Date(), '', '', 0, undefined, undefined, undefined, undefined, 1);
    bill.hydrateAggregate(events);
    return bill;
  }

  /**
   * Updates the bill metadata
   */
  updateMetadata(updates: {
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
  }): void {
    if (this._deleted) {
      throw new Error('Cannot update a deleted bill');
    }

    let hasChanges = false;
    const changes: any = {};

    if (updates.billNo !== undefined && updates.billNo !== this._billNo) {
      this._billNo = updates.billNo;
      changes.billNo = updates.billNo;
      hasChanges = true;
    }

    if (updates.supplier !== undefined && updates.supplier !== this._supplier) {
      this._supplier = updates.supplier;
      changes.supplier = updates.supplier;
      hasChanges = true;
    }

    if (updates.billDate !== undefined) {
      this._billDate = updates.billDate;
      changes.billDate = updates.billDate;
      hasChanges = true;
    }

    if (updates.dueDate !== undefined) {
      this._dueDate = updates.dueDate;
      changes.dueDate = updates.dueDate;
      hasChanges = true;
    }

    if (updates.terms !== undefined && updates.terms !== this._terms) {
      this._terms = updates.terms;
      changes.terms = updates.terms;
      hasChanges = true;
    }

    if (updates.location !== undefined && updates.location !== this._location) {
      this._location = updates.location;
      changes.location = updates.location;
      hasChanges = true;
    }

    if (updates.memo !== undefined && updates.memo !== this._memo) {
      this._memo = updates.memo;
      changes.memo = updates.memo;
      hasChanges = true;
    }

    if (updates.account !== undefined && updates.account !== this._account) {
      this._account = updates.account;
      changes.account = updates.account;
      hasChanges = true;
    }

    if (updates.lineDescription !== undefined && updates.lineDescription !== this._lineDescription) {
      this._lineDescription = updates.lineDescription;
      changes.lineDescription = updates.lineDescription;
      hasChanges = true;
    }

    if (updates.lineAmount !== undefined && updates.lineAmount !== this._lineAmount) {
      this._lineAmount = updates.lineAmount;
      changes.lineAmount = updates.lineAmount;
      hasChanges = true;
    }

    if (updates.currency !== undefined && updates.currency !== this._currency) {
      this._currency = updates.currency;
      changes.currency = updates.currency;
      hasChanges = true;
    }

    if (hasChanges) {
      this._updatedAt = new Date();
      const event = createDomainEvent(
        'bill.updated',
        { ...this.toSnapshot(), ...changes },
        this.id,
        this.sequenceNo + 1
      );
      
      this.applyEvent(event);
    }
  }

  /**
   * Marks the bill as deleted
   */
  delete(): void {
    if (this._deleted) {
      return; // Already deleted
    }

    this._deleted = true;
    this._updatedAt = new Date();

    const event = createDomainEvent(
      'bill.deleted',
      this.toSnapshot(),
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(event);
  }

  /**
   * Creates a snapshot of the current bill state
   */
  toSnapshot(): any {
    return {
      id: this._billNo,
      billNo: this._billNo,
      supplier: this._supplier,
      billDate: this._billDate,
      dueDate: this._dueDate,
      terms: this._terms,
      location: this._location,
      memo: this._memo,
      account: this._account,
      lineDescription: this._lineDescription,
      lineAmount: this._lineAmount,
      currency: this._currency,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      deleted: this._deleted,
    };
  }

  // Getters
  get billNo(): string {
    return this._billNo;
  }

  get supplier(): string {
    return this._supplier;
  }

  get billDate(): Date {
    return this._billDate;
  }

  get dueDate(): Date {
    return this._dueDate;
  }

  get terms(): string | undefined {
    return this._terms;
  }

  get location(): string | undefined {
    return this._location;
  }

  get memo(): string | undefined {
    return this._memo;
  }

  get account(): string {
    return this._account;
  }

  get lineDescription(): string {
    return this._lineDescription;
  }

  get lineAmount(): number {
    return this._lineAmount;
  }

  get currency(): string | undefined {
    return this._currency;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get deleted(): boolean {
    return this._deleted;
  }
}