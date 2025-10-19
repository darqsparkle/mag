import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  collectionGroup,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Session cache for storing invoices
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
  },
};

export interface InvoiceStockItem {
  stockId: string;
  name: string;
  qty: number;
  price: number;
  gst: number;
  amount: number;
}

export interface MonthProfit {
  serviceProfit: number;
  stockProfit: number;
  totalProfit: number;
  calculatedAt: Date;
}

export interface InvoiceServiceItem {
  serviceId: string;
  name: string;
  qty: number;
  price: number;
  gst: number;
  amount: number;
}

export interface MonthlyCounter {
  yearMonth: string; // Format: "2025-10"
  count: number;
  monthName: string; // e.g., "October2025"
  updatedAt: Date;
}

export interface MonthlyRevenue {
  yearMonth: string;
  revenue: number;
  monthName: string;
  updatedAt: Date;
}

export interface DashboardStats {
  totalInvoices: number;
  totalRevenue: number;
  monthlyCounters: MonthlyCounter[];
  monthlyRevenues: MonthlyRevenue[];
}

export interface AdditionalCharge {
  description: string;
  amount: number;
}

export interface Invoice {
  id?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerGst?: string;
  vehicleId: string;
  vehicleNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleKilometer: string;
  invoiceType: "GST" | "Non-GST";
  invoiceNumber: string;
  date: string;
  stocks: InvoiceStockItem[];
  services: InvoiceServiceItem[];
  discount: number;
  additionalCharges: AdditionalCharge[];
  note: string;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  totalAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaginatedInvoices {
  invoices: Invoice[];
  totalCount: number;
  hasMore: boolean;
}

export const clearInvoicesCache = () => {
  sessionCache.clear();
};

// Helper to calculate invoice totals
export const calculateInvoiceTotals = (
  stocks: InvoiceStockItem[],
  services: InvoiceServiceItem[],
  discount: number,
  additionalCharges: AdditionalCharge[],
  invoiceType: "GST" | "Non-GST"
) => {
  // Calculate subtotal (sum of all items before discount and GST)
  const stocksSubtotal = stocks.reduce((sum, item) => sum + item.amount, 0);
  const servicesSubtotal = services.reduce((sum, item) => sum + item.amount, 0);
  const subtotal = stocksSubtotal + servicesSubtotal;

  // Calculate discount amount (discount is percentage)
  const discountAmount = (subtotal * discount) / 100;
  const subtotalAfterDiscount = subtotal - discountAmount;

  // Calculate GST amount if GST invoice
  let gstAmount = 0;
  if (invoiceType === "GST") {
    const stocksGst = stocks.reduce((sum, item) => {
      return sum + (item.amount * item.gst) / 100;
    }, 0);
    const servicesGst = services.reduce((sum, item) => {
      return sum + (item.amount * item.gst) / 100;
    }, 0);
    gstAmount = stocksGst + servicesGst;
    // Apply discount to GST as well
    gstAmount = gstAmount * (1 - discount / 100);
  }

  // Calculate additional charges total
  const additionalTotal = additionalCharges.reduce(
    (sum, charge) => sum + charge.amount,
    0
  );

  // Calculate final total
  const totalAmount = subtotalAfterDiscount + gstAmount + additionalTotal;

  return {
    subtotal,
    discountAmount,
    gstAmount,
    totalAmount,
  };
};

// Add Invoice
export const addInvoice = async (invoice: Invoice): Promise<string> => {
  try {
    const collectionPath = getInvoiceCollectionPath(invoice.date);

    const docRef = await addDoc(collection(db, collectionPath), {
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerAddress: invoice.customerAddress,
      customerGst: invoice.customerGst || "",
      vehicleId: invoice.vehicleId,
      vehicleNumber: invoice.vehicleNumber,
      vehicleMake: invoice.vehicleMake,
      vehicleModel: invoice.vehicleModel,
      vehicleKilometer: invoice.vehicleKilometer,
      invoiceType: invoice.invoiceType,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      stocks: invoice.stocks,
      services: invoice.services,
      discount: invoice.discount,
      additionalCharges: invoice.additionalCharges,
      note: invoice.note,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      gstAmount: invoice.gstAmount,
      totalAmount: invoice.totalAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error adding invoice:", error);
    throw error;
  }
};

const getInvoiceCollectionPath = (date: string): string => {
  const dateObj = new Date(date);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `invoices/${month}${year}/invoiceIds`;
};
const getMonthCounterPath = (yearMonth: string): string => {
  return `invoiceCounters/${yearMonth}`;
};

// Get month revenue document path
const getMonthRevenuePath = (yearMonth: string): string => {
  return `invoiceRevenues/${yearMonth}`;
};

export const incrementMonthCounter = async (invoiceDate: string): Promise<void> => {
  try {
    const yearMonth = invoiceDate.slice(0, 7); // "2025-10"
    const dateObj = new Date(invoiceDate);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = `${monthNames[dateObj.getMonth()]}${dateObj.getFullYear()}`;
    
    const counterRef = doc(db, getMonthCounterPath(yearMonth));
    const counterSnap = await getDoc(counterRef);
    
    if (counterSnap.exists()) {
      const currentCount = counterSnap.data().count || 0;
      await updateDoc(counterRef, {
        count: currentCount + 1,
        updatedAt: new Date(),
      });
    } else {
      await setDoc(counterRef, {
        yearMonth,
        count: 1,
        monthName,
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Error incrementing month counter:", error);
  }
};

// Decrement monthly invoice counter
export const decrementMonthCounter = async (invoiceDate: string): Promise<void> => {
  try {
    const yearMonth = invoiceDate.slice(0, 7);
    const counterRef = doc(db, getMonthCounterPath(yearMonth));
    const counterSnap = await getDoc(counterRef);
    
    if (counterSnap.exists()) {
      const currentCount = counterSnap.data().count || 0;
      const newCount = Math.max(0, currentCount - 1);
      
      await updateDoc(counterRef, {
        count: newCount,
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Error decrementing month counter:", error);
  }
};

// Update monthly revenue
export const updateMonthRevenue = async (
  invoiceDate: string,
  amount: number,
  operation: "add" | "subtract"
): Promise<void> => {
  try {
    const yearMonth = invoiceDate.slice(0, 7);
    const dateObj = new Date(invoiceDate);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = `${monthNames[dateObj.getMonth()]}${dateObj.getFullYear()}`;
    
    const revenueRef = doc(db, getMonthRevenuePath(yearMonth));
    const revenueSnap = await getDoc(revenueRef);
    
    if (revenueSnap.exists()) {
      const currentRevenue = revenueSnap.data().revenue || 0;
      const newRevenue = operation === "add" 
        ? currentRevenue + amount 
        : Math.max(0, currentRevenue - amount);
      
      await updateDoc(revenueRef, {
        revenue: newRevenue,
        updatedAt: new Date(),
      });
    } else {
      await setDoc(revenueRef, {
        yearMonth,
        revenue: operation === "add" ? amount : 0,
        monthName,
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Error updating month revenue:", error);
  }
};

// Get all monthly counters
export const getAllMonthlyCounters = async (): Promise<MonthlyCounter[]> => {
  try {
    const countersSnapshot = await getDocs(collection(db, "invoiceCounters"));
    const counters: MonthlyCounter[] = [];
    
    countersSnapshot.forEach((doc) => {
      counters.push({
        yearMonth: doc.id,
        ...doc.data(),
      } as MonthlyCounter);
    });
    
    // Sort by yearMonth descending
    counters.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    
    return counters;
  } catch (error) {
    console.error("Error fetching monthly counters:", error);
    return [];
  }
};

// Get all monthly revenues
export const getAllMonthlyRevenues = async (): Promise<MonthlyRevenue[]> => {
  try {
    const revenuesSnapshot = await getDocs(collection(db, "invoiceRevenues"));
    const revenues: MonthlyRevenue[] = [];
    
    revenuesSnapshot.forEach((doc) => {
      revenues.push({
        yearMonth: doc.id,
        ...doc.data(),
      } as MonthlyRevenue);
    });
    
    // Sort by yearMonth descending
    revenues.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    
    return revenues;
  } catch (error) {
    console.error("Error fetching monthly revenues:", error);
    return [];
  }
};

// Get dashboard statistics
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const [counters, revenues] = await Promise.all([
      getAllMonthlyCounters(),
      getAllMonthlyRevenues(),
    ]);
    
    const totalInvoices = counters.reduce((sum, c) => sum + c.count, 0);
    const totalRevenue = revenues.reduce((sum, r) => sum + r.revenue, 0);
    
    return {
      totalInvoices,
      totalRevenue,
      monthlyCounters: counters,
      monthlyRevenues: revenues,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalInvoices: 0,
      totalRevenue: 0,
      monthlyCounters: [],
      monthlyRevenues: [],
    };
  }
};

// Recalculate all counters and revenues (one-time sync)
export const recalculateAllCountersAndRevenues = async (
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; message: string }> => {
  try {
    const allInvoices = await getAllInvoices();
    
    // Group invoices by month
    const monthlyData: { [key: string]: { count: number; revenue: number } } = {};
    
    allInvoices.forEach((invoice) => {
      const yearMonth = invoice.date.slice(0, 7);
      
      if (!monthlyData[yearMonth]) {
        monthlyData[yearMonth] = { count: 0, revenue: 0 };
      }
      
      monthlyData[yearMonth].count++;
      monthlyData[yearMonth].revenue += invoice.totalAmount;
    });
    
    // Update all months
    const months = Object.keys(monthlyData);
    for (let i = 0; i < months.length; i++) {
      const yearMonth = months[i];
      const data = monthlyData[yearMonth];
      
      const dateObj = new Date(yearMonth + "-01");
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = `${monthNames[dateObj.getMonth()]}${dateObj.getFullYear()}`;
      
      // Update counter
      await setDoc(doc(db, getMonthCounterPath(yearMonth)), {
        yearMonth,
        count: data.count,
        monthName,
        updatedAt: new Date(),
      });
      
      // Update revenue
      await setDoc(doc(db, getMonthRevenuePath(yearMonth)), {
        yearMonth,
        revenue: data.revenue,
        monthName,
        updatedAt: new Date(),
      });
      
      if (onProgress) {
        onProgress(i + 1, months.length);
      }
    }
    
    return {
      success: true,
      message: `Successfully recalculated ${months.length} months`,
    };
  } catch (error) {
    console.error("Error recalculating counters and revenues:", error);
    return {
      success: false,
      message: "Failed to recalculate data",
    };
  }
};

// Update Invoice
export const updateInvoice = async (invoice: Invoice): Promise<void> => {
  try {
    const collectionPath = getInvoiceCollectionPath(invoice.date);
    const invoiceRef = doc(db, collectionPath, invoice.id!);

    await updateDoc(invoiceRef, {
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerAddress: invoice.customerAddress,
      customerGst: invoice.customerGst || "",
      vehicleId: invoice.vehicleId,
      vehicleNumber: invoice.vehicleNumber,
      vehicleMake: invoice.vehicleMake,
      vehicleModel: invoice.vehicleModel,
      vehicleKilometer: invoice.vehicleKilometer,
      invoiceType: invoice.invoiceType,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      stocks: invoice.stocks,
      services: invoice.services,
      discount: invoice.discount,
      additionalCharges: invoice.additionalCharges,
      note: invoice.note,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      gstAmount: invoice.gstAmount,
      totalAmount: invoice.totalAmount,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    throw error;
  }
};

// Add these new methods to your InvoiceService.ts file

// Delete profit document when invoice is deleted
export const deleteProfitDocument = async (
  invoiceId: string,
  invoiceDate: string
): Promise<void> => {
  try {
    const dateObj = new Date(invoiceDate);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    const profitDocRef = doc(db, `invoices/${month}${year}/invoiceProfit`, invoiceId);
    
    // Check if document exists before deleting
    const docSnap = await getDoc(profitDocRef);
    if (docSnap.exists()) {
      await deleteDoc(profitDocRef);
      console.log(`✅ Deleted profit document for invoice ${invoiceId}`);
    } else {
      console.warn(`⚠️ Profit document not found for invoice ${invoiceId}`);
    }
  } catch (error) {
    console.error("Error deleting profit document:", error);
    // Don't throw - we don't want to fail invoice deletion if profit deletion fails
  }
};

// Update profit document when invoice is edited
export const updateProfitDocument = async (invoice: Invoice): Promise<void> => {
  try {
    const { serviceProfit, stockProfit } = await calculateInvoiceProfit(invoice);
    await storeProfitData(invoice, serviceProfit, stockProfit);
    console.log(`✅ Updated profit document for invoice ${invoice.id}`);
  } catch (error) {
    console.error("Error updating profit document:", error);
    throw error;
  }
};

// Check if a month's profit data is valid
export const checkMonthProfitValidity = async (
  yearMonth: string
): Promise<{ isValid: boolean; invoiceCount: number; profitCount: number }> => {
  try {
    const allInvoices = await getAllInvoices();
    const monthInvoices = allInvoices.filter((inv) =>
      inv.date.startsWith(yearMonth)
    );

    const dateObj = new Date(yearMonth + "-01");
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();

    const profitCollectionPath = `invoices/${month}${year}/invoiceProfit`;
    const profitDocs = await getDocs(collection(db, profitCollectionPath));

    const invoiceCount = monthInvoices.length;
    const profitCount = profitDocs.size;

    return {
      isValid: invoiceCount === profitCount,
      invoiceCount,
      profitCount,
    };
  } catch (error) {
    console.error("Error checking profit validity:", error);
    return { isValid: false, invoiceCount: 0, profitCount: 0 };
  }
};

// Recalculate profit for a specific month
export const recalculateMonthProfit = async (
  yearMonth: string,
  onProgress?: (current: number, total: number) => void
): Promise<MonthProfit> => {
  try {
    const allInvoices = await getAllInvoices();
    const monthInvoices = allInvoices.filter((inv) =>
      inv.date.startsWith(yearMonth)
    );

    let totalServiceProfit = 0;
    let totalStockProfit = 0;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < monthInvoices.length; i++) {
      try {
        const invoice = monthInvoices[i];
        const { serviceProfit, stockProfit } = await calculateInvoiceProfit(invoice);
        
        await storeProfitData(invoice, serviceProfit, stockProfit);
        
        totalServiceProfit += serviceProfit;
        totalStockProfit += stockProfit;
        success++;

        if (onProgress) {
          onProgress(i + 1, monthInvoices.length);
        }
      } catch (error) {
        console.error(`Failed to calculate profit for invoice:`, error);
        failed++;
      }
    }

    console.log(`✅ Recalculated ${yearMonth}: ${success} success, ${failed} failed`);

    return {
      serviceProfit: totalServiceProfit,
      stockProfit: totalStockProfit,
      totalProfit: totalServiceProfit + totalStockProfit,
      calculatedAt: new Date(),
    };
  } catch (error) {
    console.error("Error recalculating month profit:", error);
    throw error;
  }
};

// Get profit collection path
export const getProfitCollectionPath = (invoiceDate: string): string => {
  const dateObj = new Date(invoiceDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `invoices/${month}${year}/invoiceProfit`;
};

// Check if profit document exists for an invoice
export const doesProfitExist = async (
  invoiceId: string,
  invoiceDate: string
): Promise<boolean> => {
  try {
    const profitCollectionPath = getProfitCollectionPath(invoiceDate);
    const profitDocRef = doc(db, profitCollectionPath, invoiceId);
    const docSnap = await getDoc(profitDocRef);
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking profit existence:", error);
    return false;
  }
};

// Sync missing profit documents for a month
export const syncMissingProfits = async (
  yearMonth: string
): Promise<{ created: number; failed: number }> => {
  try {
    const allInvoices = await getAllInvoices();
    const monthInvoices = allInvoices.filter((inv) =>
      inv.date.startsWith(yearMonth)
    );

    let created = 0;
    let failed = 0;

    for (const invoice of monthInvoices) {
      try {
        const exists = await doesProfitExist(invoice.id!, invoice.date);
        
        if (!exists) {
          const { serviceProfit, stockProfit } = await calculateInvoiceProfit(invoice);
          await storeProfitData(invoice, serviceProfit, stockProfit);
          created++;
          console.log(`✅ Created missing profit for invoice ${invoice.invoiceNumber}`);
        }
      } catch (error) {
        console.error(`Failed to sync profit for invoice ${invoice.id}:`, error);
        failed++;
      }
    }

    console.log(`✅ Sync complete: ${created} created, ${failed} failed`);
    return { created, failed };
  } catch (error) {
    console.error("Error syncing missing profits:", error);
    throw error;
  }
};

// Validate overall invoice-profit integrity
export const validateInvoiceProfitIntegrity = async (): Promise<{
  missingProfits: string[];
  orphanedProfits: string[];
  totalInvoices: number;
  totalProfits: number;
}> => {
  try {
    const allInvoices = await getAllInvoices();
    const missingProfits: string[] = [];

    // Check for invoices without profit documents
    for (const invoice of allInvoices) {
      const exists = await doesProfitExist(invoice.id!, invoice.date);
      if (!exists) {
        missingProfits.push(invoice.invoiceNumber);
      }
    }

    // TODO: Check for orphaned profits (profits without invoices)
    // This would require querying all profit collections
    const orphanedProfits: string[] = [];

    return {
      missingProfits,
      orphanedProfits,
      totalInvoices: allInvoices.length,
      totalProfits: allInvoices.length - missingProfits.length,
    };
  } catch (error) {
    console.error("Error validating integrity:", error);
    throw error;
  }
};

// export const calculateInvoiceProfit = async (
//   invoice: Invoice
// ): Promise<{
//   serviceProfit: number;
//   stockProfit: number;
// }> => {
//   try {
//     // Service profit = total service amount (labour * qty)
//     const serviceProfit = invoice.services.reduce(
//       (sum, service) => sum + service.amount,
//       0
//     );

//     // Stock profit = (selling price - purchase price) * qty for each stock
//     let stockProfit = 0;

//     for (const stockItem of invoice.stocks) {
//       // Fetch stock details from stocks collection to get purchase price
//       const stocksQuery = query(
//         collectionGroup(db, "stocks"),
//         where("id", "==", stockItem.stockId)
//       );

//       // Alternative: if using flat structure
//       const stockDoc = await getDocs(
//         query(
//           collection(db, "stocks"),
//           where("__name__", "==", stockItem.stockId)
//         )
//       );

//       if (!stockDoc.empty) {
//         const stockData = stockDoc.docs[0].data();
//         const profitPerUnit = stockItem.price - stockData.purchasePrice;
//         stockProfit += profitPerUnit * stockItem.qty;
//       }
//     }

//     return { serviceProfit, stockProfit };
//   } catch (error) {
//     console.error("Error calculating invoice profit:", error);
//     throw error;
//   }
// };

export const calculateInvoiceProfit = async (
  invoice: Invoice
): Promise<{
  serviceProfit: number;
  stockProfit: number;
}> => {
  try {
    // Service profit = total service amount (labour * qty)
    const serviceProfit = invoice.services.reduce(
      (sum, service) => sum + service.amount,
      0
    );

    // Stock profit = (selling price - purchase price) * qty for each stock
    let stockProfit = 0;

    for (const stockItem of invoice.stocks) {
      try {
        // ✅ Fetch from flat structure using document ID directly
        const stockDocRef = doc(db, "stocks", stockItem.stockId);
        const stockDocSnap = await getDoc(stockDocRef);

        if (stockDocSnap.exists()) {
          const stockData = stockDocSnap.data();
          const profitPerUnit = stockItem.price - (stockData.purchasePrice || 0);
          stockProfit += profitPerUnit * stockItem.qty;
        } else {
          console.warn(`Stock not found: ${stockItem.stockId}`);
        }
      } catch (error) {
        console.error(`Error fetching stock ${stockItem.stockId}:`, error);
        // Continue to next stock item
      }
    }

    return { serviceProfit, stockProfit };
  } catch (error) {
    console.error("Error calculating invoice profit:", error);
    throw error;
  }
};

// Store profit data in month collection
export const storeProfitData = async (
  invoice: Invoice,
  serviceProfit: number,
  stockProfit: number
): Promise<void> => {
  try {
    const dateObj = new Date(invoice.date);
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const month = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    // ✅ Store in a separate collection, NOT as subcollection
    const profitDocRef = doc(db, `invoices/${month}${year}/invoiceProfit`, invoice.id!);
    
    await setDoc(profitDocRef, {
      serviceProfit,
      stockProfit,
      totalProfit: serviceProfit + stockProfit,
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice.id,
      calculatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error storing profit:", error);
    throw error;
  }
};

// Calculate profit for all invoices in a month
export const calculateMonthProfit = async (
  yearMonth: string
): Promise<MonthProfit> => {
  try {
    const allInvoices = await getAllInvoices();
    const monthInvoices = allInvoices.filter((inv) =>
      inv.date.startsWith(yearMonth)
    );

    let totalServiceProfit = 0;
    let totalStockProfit = 0;

    for (const invoice of monthInvoices) {
      const { serviceProfit, stockProfit } = await calculateInvoiceProfit(
        invoice
      );
      totalServiceProfit += serviceProfit;
      totalStockProfit += stockProfit;

      // Store individual invoice profit
      await storeProfitData(invoice, serviceProfit, stockProfit);
    }

    return {
      serviceProfit: totalServiceProfit,
      stockProfit: totalStockProfit,
      totalProfit: totalServiceProfit + totalStockProfit,
      calculatedAt: new Date(),
    };
  } catch (error) {
    console.error("Error calculating month profit:", error);
    throw error;
  }
};

// Get stored month profit
export const getMonthProfit = async (yearMonth: string): Promise<MonthProfit | null> => {
  try {
    const dateObj = new Date(yearMonth + "-01");
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const month = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    const profitCollectionPath = `invoices/${month}${year}/invoiceProfit`;
    const profitDocs = await getDocs(collection(db, profitCollectionPath));
    
    if (profitDocs.empty) return null;
    
    // ✅ Sum up all invoice profits for the month
    let totalServiceProfit = 0;
    let totalStockProfit = 0;
    
    profitDocs.forEach(doc => {
      const data = doc.data();
      totalServiceProfit += data.serviceProfit || 0;
      totalStockProfit += data.stockProfit || 0;
    });
    
    return {
      serviceProfit: totalServiceProfit,
      stockProfit: totalStockProfit,
      totalProfit: totalServiceProfit + totalStockProfit,
      calculatedAt: new Date(),
    };
  } catch (error) {
    console.error("Error fetching month profit:", error);
    return null;
  }
};

// Recalculate profit for existing invoices
export const recalculateAllProfits = async (
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> => {
  try {
    const allInvoices = await getAllInvoices();
    let success = 0;
    let failed = 0;

    for (let i = 0; i < allInvoices.length; i++) {
      try {
        const { serviceProfit, stockProfit } = await calculateInvoiceProfit(
          allInvoices[i]
        );
        await storeProfitData(allInvoices[i], serviceProfit, stockProfit);
        success++;
      } catch (error) {
        console.error(
          `Failed to calculate profit for invoice ${allInvoices[i].id}:`,
          error
        );
        failed++;
      }

      if (onProgress) {
        onProgress(i + 1, allInvoices.length);
      }
    }

    return { success, failed };
  } catch (error) {
    console.error("Error recalculating profits:", error);
    throw error;
  }
};

// Delete Invoice
export const deleteInvoice = async (
  invoiceId: string,
  invoiceDate: string
): Promise<void> => {
  try {
    const collectionPath = getInvoiceCollectionPath(invoiceDate);
    await deleteDoc(doc(db, collectionPath, invoiceId));
  } catch (error) {
    console.error("Error deleting invoice:", error);
    throw error;
  }
};

export const getAllInvoices = async (): Promise<Invoice[]> => {
  try {
    console.log("🔍 Starting getAllInvoices with collectionGroup...");
    const invoices: Invoice[] = [];

    // Query ALL subcollections named "invoiceIds" across the entire database
    const invoicesQuery = query(
      collectionGroup(db, "invoiceIds"),
      orderBy("createdAt", "desc")
    );

    console.log("🔗 Using collectionGroup query for 'invoiceIds'");

    const querySnapshot = await getDocs(invoicesQuery);
    console.log(`📄 Found ${querySnapshot.size} total invoices`);

    querySnapshot.forEach((doc) => {
      const invoiceData = doc.data();
      console.log("✅ Adding invoice:", doc.id, invoiceData.invoiceNumber);
      invoices.push({
        id: doc.id,
        ...invoiceData,
      } as Invoice);
    });

    console.log("✨ Final invoices count:", invoices.length);
    return invoices;
  } catch (error) {
    console.error("❌ Error fetching invoices:", error);
    throw error;
  }
};

export const checkOldInvoices = async (): Promise<number> => {
  try {
    const oldInvoicesQuery = query(collection(db, "invoices"));
    const snapshot = await getDocs(oldInvoicesQuery);

    // Filter only documents that are actual invoices (not month collections)
    const oldInvoices = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.invoiceNumber !== undefined; // Has invoice fields
    });

    return oldInvoices.length;
  } catch (error) {
    console.error("Error checking old invoices:", error);
    return 0;
  }
};

// Migrate old invoices
export const migrateOldInvoices = async (
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> => {
  try {
    const oldInvoicesQuery = query(collection(db, "invoices"));
    const snapshot = await getDocs(oldInvoicesQuery);

    const oldInvoices = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.invoiceNumber !== undefined;
    });

    let success = 0;
    let failed = 0;
    const total = oldInvoices.length;

    for (let i = 0; i < oldInvoices.length; i++) {
      const oldDoc = oldInvoices[i];
      const oldData = oldDoc.data() as Invoice;

      try {
        // Add to new structure
        const newCollectionPath = getInvoiceCollectionPath(oldData.date);
        await addDoc(collection(db, newCollectionPath), oldData);

        // Delete old document
        await deleteDoc(doc(db, "invoices", oldDoc.id));

        success++;

        if (onProgress) {
          onProgress(i + 1, total);
        }
      } catch (error) {
        console.error(`Failed to migrate invoice ${oldDoc.id}:`, error);
        failed++;
      }
    }

    return { success, failed };
  } catch (error) {
    console.error("Error migrating invoices:", error);
    throw error;
  }
};

// Get paginated invoices
export const getInvoicesPaginated = async (
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedInvoices> => {
  try {
    console.log("📄 Getting paginated invoices, page:", page);
    const cachedAllInvoices = sessionCache.get("allInvoicesCache");
    let allInvoices: Invoice[];

    if (cachedAllInvoices) {
      console.log("💾 Using cached invoices:", cachedAllInvoices.length);
      allInvoices = cachedAllInvoices;
    } else {
      console.log("🔄 Fetching fresh invoices...");
      allInvoices = await getAllInvoices();
      sessionCache.set("allInvoicesCache", allInvoices);
      console.log("💾 Cached invoices:", allInvoices.length);
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedInvoices = allInvoices.slice(startIndex, endIndex);

    console.log("📋 Returning:", {
      page,
      invoicesCount: paginatedInvoices.length,
      totalCount: allInvoices.length,
      hasMore: endIndex < allInvoices.length,
    });

    return {
      invoices: paginatedInvoices,
      totalCount: allInvoices.length,
      hasMore: endIndex < allInvoices.length,
    };
  } catch (error) {
    console.error("❌ Error fetching paginated invoices:", error);
    throw error;
  }
};

// Get invoices by customer
export const getInvoicesByCustomer = async (
  customerId: string
): Promise<Invoice[]> => {
  try {
    const q = query(
      collection(db, "invoices"),
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const invoices: Invoice[] = [];

    querySnapshot.forEach((doc) => {
      invoices.push({
        id: doc.id,
        ...doc.data(),
      } as Invoice);
    });

    return invoices;
  } catch (error) {
    console.error("Error fetching invoices by customer:", error);
    throw error;
  }
};

// Search invoices
export const searchInvoices = async (
  searchTerm: string
): Promise<Invoice[]> => {
  try {
    const allInvoices = await getAllInvoices();
    const lowerSearchTerm = searchTerm.toLowerCase();

    return allInvoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(lowerSearchTerm) ||
        invoice.customerName.toLowerCase().includes(lowerSearchTerm) ||
        invoice.vehicleNumber.toLowerCase().includes(lowerSearchTerm) ||
        invoice.customerPhone.includes(lowerSearchTerm)
    );
  } catch (error) {
    console.error("Error searching invoices:", error);
    throw error;
  }
};

// Filter invoices by month
export const filterInvoicesByMonth = async (
  yearMonth: string
): Promise<Invoice[]> => {
  try {
    const allInvoices = await getAllInvoices();
    return allInvoices.filter((invoice) => invoice.date.startsWith(yearMonth));
  } catch (error) {
    console.error("Error filtering invoices by month:", error);
    throw error;
  }
};

// Generate next invoice number
export const generateInvoiceNumber = async (): Promise<string> => {
  try {
    const allInvoices = await getAllInvoices();
    const lastInvoiceNumber =
      allInvoices.length > 0 ? allInvoices[0].invoiceNumber : "INV000000";

    // Extract number from invoice number (assuming format INV000001)
    const numberPart = lastInvoiceNumber.replace(/\D/g, "");
    const nextNumber = parseInt(numberPart) + 1;

    return `INV${nextNumber.toString().padStart(6, "0")}`;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    return `INV${Date.now().toString().slice(-6)}`;
  }
};
