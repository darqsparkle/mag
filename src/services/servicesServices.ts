import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
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