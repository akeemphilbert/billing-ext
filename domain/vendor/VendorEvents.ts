import { DomainEvent, createDomainEvent } from '../common/DomainEvent';
import { Vendor } from './Vendor';

// Simple CRUD events for Vendor domain - KISS approach
// Each event contains the complete domain entity as payload

/**
 * Creates a VendorCreated event
 * @param vendor The Vendor entity that was created
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for vendor creation
 */
export function createVendorCreatedEvent(
  vendor: Vendor,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<Vendor> {
  return createDomainEvent('vendor.created', vendor, aggregateId, sequenceNo);
}

/**
 * Creates a VendorUpdated event
 * @param vendor The updated Vendor entity
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for vendor update
 */
export function createVendorUpdatedEvent(
  vendor: Vendor,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<Vendor> {
  return createDomainEvent('vendor.updated', vendor, aggregateId, sequenceNo);
}

/**
 * Creates a VendorDeleted event
 * @param vendor The deleted Vendor entity
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for vendor deletion
 */
export function createVendorDeletedEvent(
  vendor: Vendor,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<Vendor> {
  return createDomainEvent('vendor.deleted', vendor, aggregateId, sequenceNo);
}

