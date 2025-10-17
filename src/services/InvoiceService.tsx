import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
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
  }
};

export interface InvoiceStockItem {
  stockId: string;
  name: string;
  qty: number;
  price: number;
  gst: number;
  amount: number;
}

export interface InvoiceServiceItem {
  serviceId: string;
  name: string;
  qty: number;
  price: number;
  gst: number;
  amount: number;
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
    const docRef = await addDoc(collection(db, "invoices"), {
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

// Update Invoice
export const updateInvoice = async (invoice: Invoice): Promise<void> => {
  try {
    const invoiceRef = doc(db, "invoices", invoice.id!);

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

// Delete Invoice
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "invoices", invoiceId));
  } catch (error) {
    console.error("Error deleting invoice:", error);
    throw error;
  }
};

// Get all invoices
export const getAllInvoices = async (): Promise<Invoice[]> => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, "invoices"), orderBy("createdAt", "desc"))
    );
    const invoices: Invoice[] = [];

    querySnapshot.forEach((doc) => {
      invoices.push({
        id: doc.id,
        ...doc.data(),
      } as Invoice);
    });

    return invoices;
  } catch (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }
};

// Get paginated invoices
export const getInvoicesPaginated = async (
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedInvoices> => {
  try {
    const cachedAllInvoices = sessionCache.get("allInvoicesCache");
    let allInvoices: Invoice[];

    if (cachedAllInvoices) {
      allInvoices = cachedAllInvoices;
    } else {
      allInvoices = await getAllInvoices();
      sessionCache.set("allInvoicesCache", allInvoices);
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedInvoices = allInvoices.slice(startIndex, endIndex);

    return {
      invoices: paginatedInvoices,
      totalCount: allInvoices.length,
      hasMore: endIndex < allInvoices.length,
    };
  } catch (error) {
    console.error("Error fetching paginated invoices:", error);
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
export const searchInvoices = async (searchTerm: string): Promise<Invoice[]> => {
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
    const lastInvoiceNumber = allInvoices.length > 0 ? allInvoices[0].invoiceNumber : "INV000000";
    
    // Extract number from invoice number (assuming format INV000001)
    const numberPart = lastInvoiceNumber.replace(/\D/g, "");
    const nextNumber = parseInt(numberPart) + 1;
    
    return `INV${nextNumber.toString().padStart(6, "0")}`;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    return `INV${Date.now().toString().slice(-6)}`;
  }
};