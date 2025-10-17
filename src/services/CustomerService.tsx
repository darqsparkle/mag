import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./../firebase/firebaseConfig";

// Session cache for storing all customers and vehicles
const sessionCache = {
  data: {} as any,
  
  set(key: string, value: any) {
    this.data[key] = value;
  },
  
  get(key: string) {
    return this.data[key];
  },
  
  clear() {
    this.data = {};
  }
};

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  address: string;
  gstNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Vehicle {
  id?: string;
  customerId: string;
  vehicleNumber: string;
  make: string;
  model: string;
  kilometer: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CustomerWithVehicles extends Customer {
  vehicles: Vehicle[];
}

// Pagination logic
export interface PaginatedCustomers {
  customers: CustomerWithVehicles[];
  totalCount: number;
  hasMore: boolean;
}

export const clearCustomersCache = () => {
  sessionCache.clear();
};

// Customer Operations
export const addCustomer = async (customer: Customer): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "customers"), {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      gstNumber: customer.gstNumber || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error adding customer:", error);
    throw error;
  }
};

export const updateCustomer = async (customer: Customer): Promise<void> => {
  try {
    const customerRef = doc(db, "customers", customer.id!);

    await updateDoc(customerRef, {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      gstNumber: customer.gstNumber || "",
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
};

export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    // Delete all vehicles associated with this customer
    const vehiclesQuery = query(
      collection(db, "vehicles"),
      where("customerId", "==", customerId)
    );
    const vehiclesSnapshot = await getDocs(vehiclesQuery);
    
    const deletePromises = vehiclesSnapshot.docs.map((doc) =>
      deleteDoc(doc.ref)
    );
    await Promise.all(deletePromises);

    // Delete the customer
    await deleteDoc(doc(db, "customers", customerId));
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
};

export const getAllCustomers = async (): Promise<Customer[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "customers"));
    const customers: Customer[] = [];
    
    querySnapshot.forEach((doc) => {
      customers.push({
        id: doc.id,
        ...doc.data(),
      } as Customer);
    });

    return customers;
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
};

// Vehicle Operations
export const addVehicle = async (vehicle: Vehicle): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "vehicles"), {
      customerId: vehicle.customerId,
      vehicleNumber: vehicle.vehicleNumber,
      make: vehicle.make,
      model: vehicle.model,
      kilometer: vehicle.kilometer,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error adding vehicle:", error);
    throw error;
  }
};

export const updateVehicle = async (vehicle: Vehicle): Promise<void> => {
  try {
    const vehicleRef = doc(db, "vehicles", vehicle.id!);

    await updateDoc(vehicleRef, {
      vehicleNumber: vehicle.vehicleNumber,
      make: vehicle.make,
      model: vehicle.model,
      kilometer: vehicle.kilometer,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    throw error;
  }
};

export const deleteVehicle = async (vehicleId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "vehicles", vehicleId));
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    throw error;
  }
};

export const getVehiclesByCustomer = async (customerId: string): Promise<Vehicle[]> => {
  try {
    const vehiclesQuery = query(
      collection(db, "vehicles"),
      where("customerId", "==", customerId)
    );
    const querySnapshot = await getDocs(vehiclesQuery);
    const vehicles: Vehicle[] = [];

    querySnapshot.forEach((doc) => {
      vehicles.push({
        id: doc.id,
        ...doc.data(),
      } as Vehicle);
    });

    return vehicles;
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    throw error;
  }
};

// Get all customers with their vehicles
export const getAllCustomersWithVehicles = async (): Promise<CustomerWithVehicles[]> => {
  try {
    const customers = await getAllCustomers();
    const allVehiclesSnapshot = await getDocs(collection(db, "vehicles"));
    
    // Group vehicles by customerId
    const vehiclesByCustomer: { [key: string]: Vehicle[] } = {};
    allVehiclesSnapshot.forEach((doc) => {
      const vehicle = { id: doc.id, ...doc.data() } as Vehicle;
      if (!vehiclesByCustomer[vehicle.customerId]) {
        vehiclesByCustomer[vehicle.customerId] = [];
      }
      vehiclesByCustomer[vehicle.customerId].push(vehicle);
    });

    // Combine customers with their vehicles
    const customersWithVehicles: CustomerWithVehicles[] = customers.map((customer) => ({
      ...customer,
      vehicles: vehiclesByCustomer[customer.id!] || [],
    }));

    return customersWithVehicles;
  } catch (error) {
    console.error("Error fetching customers with vehicles:", error);
    throw error;
  }
};

// Paginated fetch with caching
export const getCustomersPaginated = async (
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedCustomers> => {
  try {
    // Check if we have cached all customers
    const cachedAllCustomers = sessionCache.get('allCustomersCache');
    let allCustomers: CustomerWithVehicles[];

    if (cachedAllCustomers) {
      allCustomers = cachedAllCustomers;
    } else {
      allCustomers = await getAllCustomersWithVehicles();
      // Cache all customers for subsequent pagination
      sessionCache.set('allCustomersCache', allCustomers);
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCustomers = allCustomers.slice(startIndex, endIndex);

    return {
      customers: paginatedCustomers,
      totalCount: allCustomers.length,
      hasMore: endIndex < allCustomers.length,
    };
  } catch (error) {
    console.error("Error fetching paginated customers:", error);
    throw error;
  }
};

// Search functionality
export const searchCustomers = async (searchTerm: string): Promise<CustomerWithVehicles[]> => {
  try {
    const allCustomers = await getAllCustomersWithVehicles();
    const lowerSearchTerm = searchTerm.toLowerCase();

    return allCustomers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(lowerSearchTerm) ||
        customer.phone.includes(lowerSearchTerm) ||
        customer.address.toLowerCase().includes(lowerSearchTerm) ||
        customer.vehicles.some(
          (vehicle) =>
            vehicle.vehicleNumber.toLowerCase().includes(lowerSearchTerm) ||
            vehicle.make.toLowerCase().includes(lowerSearchTerm) ||
            vehicle.model.toLowerCase().includes(lowerSearchTerm)
        )
    );
  } catch (error) {
    console.error("Error searching customers:", error);
    throw error;
  }
};