import { Vendor } from '../domain/vendor/Vendor';
import { useEventStore } from '../stores/eventStore';
import { db, type VendorProjection } from './database';
import { v4 as uuidv4 } from 'uuid';

class VendorService {
  private eventStore = useEventStore();

  /**
   * Create a new vendor
   */
  async createVendor(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    notes?: string;
  }): Promise<Vendor> {
    try {
      const id = uuidv4();
      const vendor = Vendor.create(
        id,
        data.name,
        data.email,
        data.phone,
        data.address,
        data.taxId,
        data.notes
      );

      // Get uncommitted events and store them
      const uncommittedEvents = vendor.getAllUncommittedEvents();
      console.log('Uncommitted vendor events:', uncommittedEvents);
      
      if (uncommittedEvents.length > 0) {
        await this.eventStore.appendEvents(uncommittedEvents);
        vendor.markAllEventsAsCommitted();
        console.log('Vendor created and saved successfully');
      } else {
        console.warn('No uncommitted events to save');
      }

      return vendor;
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  }

  /**
   * Get all vendors
   */
  async getAllVendors(): Promise<VendorProjection[]> {
    try {
      await db.open();
      const vendors = await db.getAllVendors();
      console.log('Retrieved vendors:', vendors.length);
      return vendors;
    } catch (error) {
      console.error('Error getting all vendors:', error);
      throw error;
    }
  }

  /**
   * Get a vendor by ID
   */
  async getVendorById(id: string): Promise<VendorProjection | undefined> {
    try {
      await db.open();
      return await db.getVendorById(id);
    } catch (error) {
      console.error('Error getting vendor by ID:', error);
      throw error;
    }
  }

  /**
   * Get a vendor by name (case-insensitive)
   */
  async getVendorByName(name: string): Promise<VendorProjection | undefined> {
    try {
      await db.open();
      return await db.getVendorByName(name);
    } catch (error) {
      console.error('Error getting vendor by name:', error);
      throw error;
    }
  }

  /**
   * Update a vendor
   */
  async updateVendor(id: string, updates: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    notes?: string;
  }): Promise<void> {
    // Get events for this aggregate
    const events = await this.eventStore.getEventsByAggregateId(id);
    const vendor = Vendor.fromEvents(id, events);

    // Update the vendor
    vendor.updateMetadata(updates);

    // Store new events
    const uncommittedEvents = vendor.getAllUncommittedEvents();
    if (uncommittedEvents.length > 0) {
      await this.eventStore.appendEvents(uncommittedEvents);
      vendor.markAllEventsAsCommitted();
    }
  }

  /**
   * Delete a vendor
   */
  async deleteVendor(id: string): Promise<void> {
    // Get events for this aggregate
    const events = await this.eventStore.getEventsByAggregateId(id);
    const vendor = Vendor.fromEvents(id, events);

    // Delete the vendor
    vendor.delete();

    // Store the delete event
    const uncommittedEvents = vendor.getAllUncommittedEvents();
    if (uncommittedEvents.length > 0) {
      await this.eventStore.appendEvents(uncommittedEvents);
      vendor.markAllEventsAsCommitted();
    }
  }
}

export const vendorService = new VendorService();

