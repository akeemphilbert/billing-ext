import { AggregateRoot } from '../common/AggregateRoot';
import { DomainEvent } from '../common/DomainEvent';
import { createDomainEvent } from '../common/DomainEvent';

/**
 * Account Aggregate Root
 * Represents an accounting account/category that can be used for bill line items
 */
export class Account extends AggregateRoot {
  private _code: string;
  private _name: string;
  private _description?: string;
  private _accountType?: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _deleted: boolean;

  /**
   * Private constructor for creating new accounts
   */
  constructor(
    id: string,
    code: string,
    name: string,
    description?: string,
    accountType?: string,
    version: number = 1
  ) {
    super(id, version);
    this._code = code;
    this._name = name;
    this._description = description;
    this._accountType = accountType;
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._deleted = false;
  }

  /**
   * Static factory method to create a new account with event emission
   */
  static create(
    id: string,
    code: string,
    name: string,
    description?: string,
    accountType?: string
  ): Account {
    const account = new Account(
      id,
      code,
      name,
      description,
      accountType
    );
    
    const event = createDomainEvent(
      'account.created',
      account.toSnapshot(),
      account.id,
      account.sequenceNo + 1
    );
    
    account.applyEvent(event);
    return account;
  }

  /**
   * Static factory method to reconstruct an account from events
   */
  static fromEvents(id: string, events: DomainEvent[]): Account {
    const account = new Account(id, '', '', undefined, undefined, 1);
    account.hydrateAggregate(events);
    return account;
  }

  /**
   * Updates the account metadata
   */
  updateMetadata(updates: {
    code?: string;
    name?: string;
    description?: string;
    accountType?: string;
  }): void {
    if (this._deleted) {
      throw new Error('Cannot update a deleted account');
    }

    let hasChanges = false;
    const changes: any = {};

    if (updates.code !== undefined && updates.code !== this._code) {
      this._code = updates.code;
      changes.code = updates.code;
      hasChanges = true;
    }

    if (updates.name !== undefined && updates.name !== this._name) {
      this._name = updates.name;
      changes.name = updates.name;
      hasChanges = true;
    }

    if (updates.description !== undefined && updates.description !== this._description) {
      this._description = updates.description;
      changes.description = updates.description;
      hasChanges = true;
    }

    if (updates.accountType !== undefined && updates.accountType !== this._accountType) {
      this._accountType = updates.accountType;
      changes.accountType = updates.accountType;
      hasChanges = true;
    }

    if (hasChanges) {
      this._updatedAt = new Date();
      const event = createDomainEvent(
        'account.updated',
        { ...this.toSnapshot(), ...changes },
        this.id,
        this.sequenceNo + 1
      );
      
      this.applyEvent(event);
    }
  }

  /**
   * Marks the account as deleted
   */
  delete(): void {
    if (this._deleted) {
      return; // Already deleted
    }

    this._deleted = true;
    this._updatedAt = new Date();

    const event = createDomainEvent(
      'account.deleted',
      this.toSnapshot(),
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(event);
  }

  /**
   * Creates a snapshot of the current account state
   */
  toSnapshot(): any {
    return {
      id: this.id,
      code: this._code,
      name: this._name,
      description: this._description,
      accountType: this._accountType,
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
      case 'account.created':
        this.applyAccountCreated(event);
        break;
      case 'account.updated':
        this.applyAccountUpdated(event);
        break;
      case 'account.deleted':
        this.applyAccountDeleted(event);
        break;
    }
  }

  /**
   * Applies an AccountCreated event
   */
  private applyAccountCreated(event: DomainEvent): void {
    const data = event.data as any;
    this._code = data.code;
    this._name = data.name;
    this._description = data.description;
    this._accountType = data.accountType;
    this._createdAt = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt);
    this._updatedAt = data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt);
    this._deleted = data.deleted || false;
  }

  /**
   * Applies an AccountUpdated event
   */
  private applyAccountUpdated(event: DomainEvent): void {
    const data = event.data as any;
    if (data.code !== undefined) this._code = data.code;
    if (data.name !== undefined) this._name = data.name;
    if (data.description !== undefined) this._description = data.description;
    if (data.accountType !== undefined) this._accountType = data.accountType;
    if (data.updatedAt !== undefined) {
      this._updatedAt = data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt);
    }
  }

  /**
   * Applies an AccountDeleted event
   */
  private applyAccountDeleted(event: DomainEvent): void {
    this._deleted = true;
    this._updatedAt = new Date();
  }

  // Getters
  get code(): string {
    return this._code;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get accountType(): string | undefined {
    return this._accountType;
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

