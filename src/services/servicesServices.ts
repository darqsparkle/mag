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

// Session cache for storing all services
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

export interface Service {
  id?: string;
  serviceName: string;
  hsnCode: string;
  gst: number;
  labour: number;
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Pagination logic
export interface PaginatedServices {
  services: Service[];
  totalCount: number;
  hasMore: boolean;
}

export interface ServiceCategory {
  id?: string;
  name: string;
  createdAt?: Date;
}

// Add to servicesServices.ts

export const searchServicesFlat = async (searchTerm: string): Promise<Service[]> => {
  try {
    const allServices = await getAllServicesFlat();
    const lowerSearchTerm = searchTerm.toLowerCase();

    return allServices.filter(
      (service) =>
        service.serviceName.toLowerCase().includes(lowerSearchTerm) ||
        service.category.toLowerCase().includes(lowerSearchTerm) ||
        service.hsnCode.toLowerCase().includes(lowerSearchTerm)
    );
  } catch (error) {
    console.error("Error searching services:", error);
    throw error;
  }
};
// Add to servicesServices.ts for testing
// Add this method to handle both old and new structures
export const getServicesByCategoryForInvoice = async (
  categoryName: string
): Promise<Service[]> => {
  try {
    // Check if using new flat structure
    const useNewStructure = localStorage.getItem('useNewStructure') === 'true';
    
    if (useNewStructure) {
      return await getServicesByCategoryFlat(categoryName);
    } else {
      return await getServicesByCategory(categoryName);
    }
  } catch (error) {
    console.error("Error fetching services for invoice:", error);
    throw error;
  }
};

// Add this method for getting all services (invoice needs this)
export const getAllServicesForInvoice = async (): Promise<Service[]> => {
  try {
    const useNewStructure = localStorage.getItem('useNewStructure') === 'true';
    
    if (useNewStructure) {
      return await getAllServicesFlat();
    } else {
      return await getAllServices();
    }
  } catch (error) {
    console.error("Error fetching all services for invoice:", error);
    throw error;
  }
};

export const testNewStructure = async () => {
  try {
    console.log('Testing new flat structure...');
    
    const allServices = await getAllServicesFlat();
    console.log('Total services:', allServices.length);
    console.log('Sample service:', allServices[0]);
    
    const categories = await getServiceCategories();
    console.log('Categories:', categories.map(c => c.name));
    
    if (categories.length > 0) {
      const byCategory = await getServicesByCategoryFlat(categories[0].name);
      console.log(`Services in ${categories[0].name}:`, byCategory.length);
    }
    
    return { success: true, count: allServices.length };
  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error };
  }
};

// Add to servicesServices.ts

export const addServiceFlat = async (service: Service): Promise<string> => {
  try {
    const serviceRef = collection(db, "services");
    const docRef = await addDoc(serviceRef, {
      serviceName: service.serviceName,
      hsnCode: service.hsnCode,
      gst: service.gst,
      labour: service.labour,
      category: service.category,
      firstLetter: service.serviceName.charAt(0).toLowerCase(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding service:", error);
    throw error;
  }
};

export const updateServiceFlat = async (service: Service): Promise<void> => {
  try {
    const serviceRef = doc(db, "services", service.id!);
    await updateDoc(serviceRef, {
      serviceName: service.serviceName,
      hsnCode: service.hsnCode,
      gst: service.gst,
      labour: service.labour,
      category: service.category,
      firstLetter: service.serviceName.charAt(0).toLowerCase(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating service:", error);
    throw error;
  }
};

export const deleteServiceFlat = async (serviceId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "services", serviceId));
  } catch (error) {
    console.error("Error deleting service:", error);
    throw error;
  }
};

export const getServicesByCategoryFlat = async (category: string): Promise<Service[]> => {
  try {
    const q = query(
      collection(db, "services"),
      where("category", "==", category)
    );
    const querySnapshot = await getDocs(q);
    const services: Service[] = [];
    querySnapshot.forEach((doc) => {
      services.push({ id: doc.id, ...doc.data() } as Service);
    });
    return services;
  } catch (error) {
    console.error("Error fetching services:", error);
    throw error;
  }
};

export const getAllServicesFlat = async (): Promise<Service[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "services"));
    const services: Service[] = [];
    querySnapshot.forEach((doc) => {
      services.push({ id: doc.id, ...doc.data() } as Service);
    });
    return services;
  } catch (error) {
    console.error("Error fetching services:", error);
    throw error;
  }
};

export const getServicesPaginatedFlat = async (
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedServices> => {
  try {
    const cachedAllServices = sessionCache.get('allServicesCache');
    let allServices: Service[];

    if (cachedAllServices) {
      allServices = cachedAllServices;
    } else {
      allServices = await getAllServicesFlat();
      sessionCache.set('allServicesCache', allServices);
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedServices = allServices.slice(startIndex, endIndex);

    return {
      services: paginatedServices,
      totalCount: allServices.length,
      hasMore: endIndex < allServices.length,
    };
  } catch (error) {
    console.error("Error fetching paginated services:", error);
    throw error;
  }
};

export const migrateServicesToFlatStructure = async (): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> => {
  try {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    // Get all categories
    const categories = await getServiceCategories();
    
    for (const category of categories) {
      // Get all services from old structure
      const services = await getServicesByCategory(category.name);
      
      for (const service of services) {
        try {
          // Add to new flat structure
          await addServiceFlat({
            serviceName: service.serviceName,
            hsnCode: service.hsnCode,
            gst: service.gst,
            labour: service.labour,
            category: service.category,
          });
          
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to migrate ${service.serviceName}: ${error}`);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
};

export const cleanupOldStructure = async (): Promise<void> => {
  // WARNING: Only run this AFTER verifying migration was successful
  try {
    const categories = await getServiceCategories();
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    
    for (const category of categories) {
      for (const letter of letters) {
        try {
          const serviceRef = collection(db, `services/${category.name}/${letter}`);
          const querySnapshot = await getDocs(serviceRef);
          
          const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
        } catch (error) {
          // Letter collection might not exist
          continue;
        }
      }
    }
  } catch (error) {
    console.error("Cleanup error:", error);
    throw error;
  }
};

// Category Operations
export const createServiceCategory = async (categoryName: string): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "servicesCategory"), {
      name: categoryName,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating service category:", error);
    throw error;
  }
};

export const getServiceCategories = async (): Promise<ServiceCategory[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "servicesCategory"));
    const categories: ServiceCategory[] = [];
    querySnapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data(),
      } as ServiceCategory);
    });
    return categories;
  } catch (error) {
    console.error("Error fetching service categories:", error);
    throw error;
  }
};

export const deleteServiceCategory = async (categoryId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "servicesCategory", categoryId));
  } catch (error) {
    console.error("Error deleting service category:", error);
    throw error;
  }
};

// Service Operations
// Database structure: services/{category}/{firstLetter}/{documentId}

const getFirstLetter = (text: string): string => {
  return text.charAt(0).toLowerCase();
};

export const clearServicesCache = () => {
  sessionCache.clear();
};

export const addService = async (service: Service): Promise<string> => {
  try {
    const firstLetter = getFirstLetter(service.serviceName);
    const serviceRef = collection(db, `services/${service.category}/${firstLetter}`);

    const docRef = await addDoc(serviceRef, {
      serviceName: service.serviceName,
      hsnCode: service.hsnCode,
      gst: service.gst,
      labour: service.labour,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error adding service:", error);
    throw error;
  }
};

export const updateService = async (service: Service): Promise<void> => {
  try {
    const firstLetter = getFirstLetter(service.serviceName);

    const serviceRef = doc(
      db,
      `services/${service.category}/${firstLetter}/${service.id}`
    );

    await updateDoc(serviceRef, {
      serviceName: service.serviceName,
      hsnCode: service.hsnCode,
      gst: service.gst,
      labour: service.labour,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating service:", error);
    throw error;
  }
};

export const deleteService = async (service: Service): Promise<void> => {
  try {
    const firstLetter = getFirstLetter(service.serviceName);
    const serviceRef = doc(
      db,
      `services/${service.category}/${firstLetter}/${service.id}`
    );

    await deleteDoc(serviceRef);
  } catch (error) {
    console.error("Error deleting service:", error);
    throw error;
  }
};

export const getServicesByCategory = async (
  category: string
): Promise<Service[]> => {
  try {
    const services: Service[] = [];
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");

    for (const letter of letters) {
      try {
        const serviceRef = collection(db, `services/${category}/${letter}`);
        const querySnapshot = await getDocs(serviceRef);

        querySnapshot.forEach((doc) => {
          services.push({
            id: doc.id,
            ...doc.data(),
            category,
          } as Service);
        });
      } catch (error) {
        // Letter collection might not exist
        continue;
      }
    }

    return services;
  } catch (error) {
    console.error("Error fetching services by category:", error);
    throw error;
  }
};

export const getServicesPaginated = async (
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedServices> => {
  try {
    // Check if we have cached all services
    const cachedAllServices = sessionCache.get('allServicesCache');
    let allServices: Service[];

    if (cachedAllServices) {
      allServices = cachedAllServices;
    } else {
      const categories = await getServiceCategories();
      allServices = [];

      for (const category of categories) {
        const services = await getServicesByCategory(category.name);
        allServices = [...allServices, ...services];
      }

      // Cache all services for subsequent pagination
      sessionCache.set('allServicesCache', allServices);
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedServices = allServices.slice(startIndex, endIndex);

    return {
      services: paginatedServices,
      totalCount: allServices.length,
      hasMore: endIndex < allServices.length,
    };
  } catch (error) {
    console.error("Error fetching paginated services:", error);
    throw error;
  }
};

export const getAllServices = async (): Promise<Service[]> => {
  try {
    const categories = await getServiceCategories();
    let allServices: Service[] = [];

    for (const category of categories) {
      const services = await getServicesByCategory(category.name);
      allServices = [...allServices, ...services];
    }

    return allServices;
  } catch (error) {
    console.error("Error fetching all services:", error);
    throw error;
  }
};

export const searchServices = async (searchTerm: string): Promise<Service[]> => {
  try {
    const allServices = await getAllServices();
    const lowerSearchTerm = searchTerm.toLowerCase();

    return allServices.filter(
      (service) =>
        service.serviceName.toLowerCase().includes(lowerSearchTerm) ||
        service.category.toLowerCase().includes(lowerSearchTerm) ||
        service.hsnCode.toLowerCase().includes(lowerSearchTerm)
    );
  } catch (error) {
    console.error("Error searching services:", error);
    throw error;
  }
};