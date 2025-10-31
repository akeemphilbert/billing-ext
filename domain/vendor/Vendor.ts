import { AggregateRoot } from '../common/AggregateRoot';
import { DomainEvent } from '../common/DomainEvent';
import { createDomainEvent } from '../common/DomainEvent';

/**
 * Vendor Aggregate Root
 * Represents a vendor/supplier that can be associated with bills
 */
export class Vendor extends AggregateRoot {
  private _name: string;
  private _email?: string;
  private _phone?: string;
  private _address?: string;
  private _taxId?: string;
  private _notes?: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _deleted: boolean;

  /**
   * Private constructor for creating new vendors
   */
  constructor(
    id: string,
    name: string,
    email?: string,
    phone?: string,
    address?: string,
    taxId?: string,
    notes?: string,
    version: number = 1
  ) {
    super(id, version);
    this._name = name;
    this._email = email;
    this._phone = phone;
    this._address = address;
    this._taxId = taxId;
    this._notes = notes;
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._deleted = false;
  }

  /**
   * Static factory method to create a new vendor with event emission
   */
  static create(
    id: string,
    name: string,
    email?: string,
    phone?: string,
    address?: string,
    taxId?: string,
    notes?: string
  ): Vendor {
    const vendor = new Vendor(
      id,
      name,
      email,
      phone,
      address,
      taxId,
      notes
    );
    
    const event = createDomainEvent(
      'vendor.created',
      vendor.toSnapshot(),
      vendor.id,
      vendor.sequenceNo + 1
    );
    
    vendor.applyEvent(event);
    return vendor;
  }

  /**
   * Static factory method to reconstruct a vendor from events
   */
  static fromEvents(id: string, events: DomainEvent[]): Vendor {
    const vendor = new Vendor(id, '', undefined, undefined, undefined, undefined, undefined, 1);
    vendor.hydrateAggregate(events);
    return vendor;
  }

  /**
   * Updates the vendor metadata
   */
  updateMetadata(updates: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    notes?: string;
  }): void {
    if (this._deleted) {
      throw new Error('Cannot update a deleted vendor');
    }

    let hasChanges = false;
    const changes: any = {};

    if (updates.name !== undefined && updates.name !== this._name) {
      this._name = updates.name;
      changes.name = updates.name;
      hasChanges = true;
    }

    if (updates.email !== undefined && updates.email !== this._email) {
      this._email = updates.email;
      changes.email = updates.email;
      hasChanges = true;
    }

    if (updates.phone !== undefined && updates.phone !== this._phone) {
      this._phone = updates.phone;
      changes.phone = updates.phone;
      hasChanges = true;
    }

    if (updates.address !== undefined && updates.address !== this._address) {
      this._address = updates.address;
      changes.address = updates.address;
      hasChanges = true;
    }

    if (updates.taxId !== undefined && updates.taxId !== this._taxId) {
      this._taxId = updates.taxId;
      changes.taxId = updates.taxId;
      hasChanges = true;
    }

    if (updates.notes !== undefined && updates.notes !== this._notes) {
      this._notes = updates.notes;
      changes.notes = updates.notes;
      hasChanges = true;
    }

    if (hasChanges) {
      this._updatedAt = new Date();
      const event = createDomainEvent(
        'vendor.updated',
        { ...this.toSnapshot(), ...changes },
        this.id,
        this.sequenceNo + 1
      );
      
      this.applyEvent(event);
    }
  }

  /**
   * Marks the vendor as deleted
   */
  delete(): void {
    if (this._deleted) {
      return; // Already deleted
    }

    this._deleted = true;
    this._updatedAt = new Date();

    const event = createDomainEvent(
      'vendor.deleted',
      this.toSnapshot(),
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(event);
  }

  /**
   * Creates a snapshot of the current vendor state
   */
  toSnapshot(): any {
    return {
      id: this.id,
      name: this._name,
      email: this._email,
      phone: this._phone,
      address: this._address,
      taxId: this._taxId,
      notes: this._notes,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      deleted: this._deleted,
    };
  }

  /**
   * Applies domain events to restore state
   * @param event The domain event to apply
   */
  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case 'vendor.created':
        this.applyVendorCreated(event);
        break;
      case 'vendor.updated':
        this.applyVendorUpdated(event);
        break;
      case 'vendor.deleted':
        this.applyVendorDeleted(event);
        break;
    }
  }

  /**
   * Applies a VendorCreated event
   */
  private applyVendorCreated(event: DomainEvent): void {
    const data = event.data as any;
    this._name = data.name;
    this._email = data.email;
    this._phone = data.phone;
    this._address = data.address;
    this._taxId = data.taxId;
    this._notes = data.notes;
    this._createdAt = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt);
    this._updatedAt = data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt);
    this._deleted = data.deleted || false;
  }

  /**
   * Applies a VendorUpdated event
   */
  private applyVendorUpdated(event: DomainEvent): void {
    const data = event.data as any;
    if (data.name !== undefined) this._name = data.name;
    if (data.email !== undefined) this._email = data.email;
    if (data.phone !== undefined) this._phone = data.phone;
    if (data.address !== undefined) this._address = data.address;
    if (data.taxId !== undefined) this._taxId = data.taxId;
    if (data.notes !== undefined) this._notes = data.notes;
    if (data.updatedAt !== undefined) {
      this._updatedAt = data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt);
    }
  }

  /**
   * Applies a VendorDeleted event
   */
  private applyVendorDeleted(event: DomainEvent): void {
    this._deleted = true;
    this._updatedAt = new Date();
  }

  // Getters
  get name(): string {
    return this._name;
  }

  get email(): string | undefined {
    return this._email;
  }

  get phone(): string | undefined {
    return this._phone;
  }

  get address(): string | undefined {
    return this._address;
  }

  get taxId(): string | undefined {
    return this._taxId;
  }

  get notes(): string | undefined {
    return this._notes;
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

