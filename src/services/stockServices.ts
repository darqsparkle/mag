import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  setDoc,
} from "firebase/firestore";
import { db } from "./../firebase/firebaseConfig";

// Session cache for storing all stocks
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

export interface Stock {
  id?: string;
  productName: string;
  partNumber: string;
  hsnCode: string;
  purchasePrice: number;
  profitMargin: number;
  sellingPrice: number;
  gst: number;
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// pagination logic
export interface PaginatedStocks {
  stocks: Stock[];
  totalCount: number;
  hasMore: boolean;
}

export interface Category {
  id?: string;
  name: string;
  createdAt?: Date;
}

// Category Operations
export const createCategory = async (categoryName: string): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "stocksCategory"), {
      name: categoryName,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
};

// Flat structure CRUD operations
export const addStockFlat = async (stock: Stock): Promise<string> => {
  try {
    const stockRef = collection(db, "stocks");
    const docRef = await addDoc(stockRef, {
      productName: stock.productName,
      partNumber: stock.partNumber,
      hsnCode: stock.hsnCode,
      purchasePrice: stock.purchasePrice,
      profitMargin: stock.profitMargin,
      sellingPrice: stock.sellingPrice,
      gst: stock.gst,
      category: stock.category,
      firstLetter: stock.productName.charAt(0).toLowerCase(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding stock:", error);
    throw error;
  }
};

export const updateStockFlat = async (stock: Stock): Promise<void> => {
  try {
    const stockRef = doc(db, "stocks", stock.id!);
    await updateDoc(stockRef, {
      productName: stock.productName,
      partNumber: stock.partNumber,
      hsnCode: stock.hsnCode,
      purchasePrice: stock.purchasePrice,
      profitMargin: stock.profitMargin,
      sellingPrice: stock.sellingPrice,
      gst: stock.gst,
      category: stock.category,
      firstLetter: stock.productName.charAt(0).toLowerCase(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    throw error;
  }
};

export const deleteStockFlat = async (stockId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "stocks", stockId));
  } catch (error) {
    console.error("Error deleting stock:", error);
    throw error;
  }
};

export const getStocksByCategoryFlat = async (category: string): Promise<Stock[]> => {
  try {
    const q = query(
      collection(db, "stocks"),
      where("category", "==", category)
    );
    const querySnapshot = await getDocs(q);
    const stocks: Stock[] = [];
    querySnapshot.forEach((doc) => {
      stocks.push({ id: doc.id, ...doc.data() } as Stock);
    });
    return stocks;
  } catch (error) {
    console.error("Error fetching stocks:", error);
    throw error;
  }
};

export const getAllStocksFlat = async (): Promise<Stock[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "stocks"));
    const stocks: Stock[] = [];
    querySnapshot.forEach((doc) => {
      stocks.push({ id: doc.id, ...doc.data() } as Stock);
    });
    return stocks;
  } catch (error) {
    console.error("Error fetching stocks:", error);
    throw error;
  }
};

export const getStocksPaginatedFlat = async (
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedStocks> => {
  try {
    const cachedAllStocks = sessionCache.get('allStocksCache');
    let allStocks: Stock[];

    if (cachedAllStocks) {
      allStocks = cachedAllStocks;
    } else {
      allStocks = await getAllStocksFlat();
      sessionCache.set('allStocksCache', allStocks);
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedStocks = allStocks.slice(startIndex, endIndex);

    return {
      stocks: paginatedStocks,
      totalCount: allStocks.length,
      hasMore: endIndex < allStocks.length,
    };
  } catch (error) {
    console.error("Error fetching paginated stocks:", error);
    throw error;
  }
};


export const migrateStocksToFlatStructure = async (): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> => {
  try {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    const categories = await getCategories();
    
    for (const category of categories) {
      const stocks = await getStocksByCategory(category.name);
      
      for (const stock of stocks) {
        try {
          await addStockFlat({
            productName: stock.productName,
            partNumber: stock.partNumber,
            hsnCode: stock.hsnCode,
            purchasePrice: stock.purchasePrice,
            profitMargin: stock.profitMargin,
            sellingPrice: stock.sellingPrice,
            gst: stock.gst,
            category: stock.category,
          });
          
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to migrate ${stock.productName}: ${error}`);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
};

export const cleanupOldStockStructure = async (): Promise<void> => {
  try {
    const categories = await getCategories();
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    
    for (const category of categories) {
      for (const letter of letters) {
        try {
          const stockRef = collection(db, `stocks/${category.name}/${letter}`);
          const querySnapshot = await getDocs(stockRef);
          
          const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
        } catch (error) {
          continue;
        }
      }
    }
  } catch (error) {
    console.error("Cleanup error:", error);
    throw error;
  }
};

// For invoice to use
export const getStocksByCategoryForInvoice = async (
  categoryName: string
): Promise<Stock[]> => {
  try {
    // ✅ Always use new flat structure
    return await getStocksByCategoryFlat(categoryName);
  } catch (error) {
    console.error("Error fetching stocks for invoice:", error);
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "stocksCategory"));
    const categories: Category[] = [];
    querySnapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data(),
      } as Category);
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "stocksCategory", categoryId));
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

// Stock Operations
// Database structure: stocks/{category}/{firstLetter}/{documentId}

const getFirstLetter = (text: string): string => {
  return text.charAt(0).toLowerCase();
};
export const clearStocksCache = () => {
  sessionCache.clear();
};

export const addStock = async (stock: Stock): Promise<string> => {
  try {
    const firstLetter = getFirstLetter(stock.productName);
    const stockRef = collection(db, `stocks/${stock.category}/${firstLetter}`);

    const docRef = await addDoc(stockRef, {
      productName: stock.productName,
      partNumber: stock.partNumber,
      hsnCode: stock.hsnCode,
      purchasePrice: stock.purchasePrice,
      profitMargin: stock.profitMargin,
      sellingPrice: stock.sellingPrice,
      gst: stock.gst,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error adding stock:", error);
    throw error;
  }
};

export const updateStock = async (stock: Stock): Promise<void> => {
  try {
    const firstLetter = getFirstLetter(stock.productName);
    const oldFirstLetter = stock.id
      ? getFirstLetter(stock.productName)
      : firstLetter;

    const stockRef = doc(
      db,
      `stocks/${stock.category}/${firstLetter}/${stock.id}`
    );

    await updateDoc(stockRef, {
      productName: stock.productName,
      partNumber: stock.partNumber,
      hsnCode: stock.hsnCode,
      purchasePrice: stock.purchasePrice,
      profitMargin: stock.profitMargin,
      sellingPrice: stock.sellingPrice,
      gst: stock.gst,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    throw error;
  }
};

export const deleteStock = async (stock: Stock): Promise<void> => {
  try {
    const firstLetter = getFirstLetter(stock.productName);
    const stockRef = doc(
      db,
      `stocks/${stock.category}/${firstLetter}/${stock.id}`
    );

    await deleteDoc(stockRef);
  } catch (error) {
    console.error("Error deleting stock:", error);
    throw error;
  }
};

export const getStocksByCategory = async (
  category: string
): Promise<Stock[]> => {
  try {
    const stocks: Stock[] = [];
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");

    for (const letter of letters) {
      try {
        const stockRef = collection(db, `stocks/${category}/${letter}`);
        const querySnapshot = await getDocs(stockRef);

        querySnapshot.forEach((doc) => {
          stocks.push({
            id: doc.id,
            ...doc.data(),
            category,
          } as Stock);
        });
      } catch (error) {
        // Letter collection might not exist
        continue;
      }
    }

    return stocks;
  } catch (error) {
    console.error("Error fetching stocks by category:", error);
    throw error;
  }
};
export const getStocksPaginated = async (
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedStocks> => {
  try {
    // Check if we have cached all stocks
    const cachedAllStocks = sessionCache.get('allStocksCache');
    let allStocks: Stock[];

    if (cachedAllStocks) {
      allStocks = cachedAllStocks;
    } else {
      const categories = await getCategories();
      allStocks = [];

      for (const category of categories) {
        const stocks = await getStocksByCategory(category.name);
        allStocks = [...allStocks, ...stocks];
      }

      // Cache all stocks for subsequent pagination
      sessionCache.set('allStocksCache', allStocks);
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedStocks = allStocks.slice(startIndex, endIndex);

    return {
      stocks: paginatedStocks,
      totalCount: allStocks.length,
      hasMore: endIndex < allStocks.length,
    };
  } catch (error) {
    console.error("Error fetching paginated stocks:", error);
    throw error;
  }
};

export const getAllStocks = async (): Promise<Stock[]> => {
  try {
    const categories = await getCategories();
    let allStocks: Stock[] = [];

    for (const category of categories) {
      const stocks = await getStocksByCategory(category.name);
      allStocks = [...allStocks, ...stocks];
    }

    return allStocks;
  } catch (error) {
    console.error("Error fetching all stocks:", error);
    throw error;
  }
};

export const searchStocks = async (searchTerm: string): Promise<Stock[]> => {
  try {
    const allStocks = await getAllStocks();
    const lowerSearchTerm = searchTerm.toLowerCase();

    return allStocks.filter(
      (stock) =>
        stock.productName.toLowerCase().includes(lowerSearchTerm) ||
        stock.partNumber.toLowerCase().includes(lowerSearchTerm) ||
        stock.category.toLowerCase().includes(lowerSearchTerm) ||
        stock.hsnCode.toLowerCase().includes(lowerSearchTerm)
    );
  } catch (error) {
    console.error("Error searching stocks:", error);
    throw error;
  }
};
