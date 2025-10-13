export interface Stock {
  id: string;
  productName: string;
  partNumber: string;
  hsnCode: string;
  purchasePrice: number;
  profitMargin: number;
  sellingPrice: number;
  gst: number;
  category: string;
}

export interface Service {
  id: string;
  serviceName: string;
  hsnCode: string;
  gst: number;
  labour: number;
  category: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  gstNumber?: string;
  vehicleNumber: string;
  model: string;
  make: string;
  kilometer: string;
}

export interface InvoiceItem {
  id: string;
  type: 'stock' | 'service';
  name: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  gst: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: Customer;
  isGST: boolean;
  items: InvoiceItem[];
  discount: number;
  additionalCharges: { description: string; amount: number }[];
  note: string;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
}
