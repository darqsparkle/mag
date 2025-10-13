import { createContext, useContext, useState, ReactNode } from 'react';
import { Stock, Service, Customer, Invoice } from '../types';

interface AppContextType {
  stocks: Stock[];
  services: Service[];
  customers: Customer[];
  invoices: Invoice[];
  categories: { stocks: string[]; services: string[] };
  currentUser: string | null;
  addStock: (stock: Stock) => void;
  updateStock: (stock: Stock) => void;
  deleteStock: (id: string) => void;
  addService: (service: Service) => void;
  updateService: (service: Service) => void;
  deleteService: (id: string) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  addCategory: (type: 'stocks' | 'services', category: string) => void;
  deleteCategory: (type: 'stocks' | 'services', category: string) => void;
  login: (email: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialStocks: Stock[] = [
  {
    id: '1',
    productName: 'Engine Oil 5W-30',
    partNumber: 'EO-5W30-001',
    hsnCode: '27101980',
    purchasePrice: 450,
    profitMargin: 25,
    sellingPrice: 562.5,
    gst: 18,
    category: 'Lubricants',
  },
  {
    id: '2',
    productName: 'Brake Pads Front',
    partNumber: 'BP-F-002',
    hsnCode: '87083010',
    purchasePrice: 1200,
    profitMargin: 30,
    sellingPrice: 1560,
    gst: 28,
    category: 'Brake System',
  },
];

const initialServices: Service[] = [
  {
    id: '1',
    serviceName: 'General Service',
    hsnCode: '998599',
    gst: 18,
    labour: 800,
    category: 'Maintenance',
  },
  {
    id: '2',
    serviceName: 'AC Repair',
    hsnCode: '998599',
    gst: 18,
    labour: 1500,
    category: 'AC Services',
  },
];

const initialCustomers: Customer[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    address: '123 MG Road, Bangalore',
    phone: '9876543210',
    gstNumber: '29ABCDE1234F1Z5',
    vehicleNumber: 'KA01AB1234',
    model: 'Swift',
    make: 'Maruti Suzuki',
    kilometer: '45000',
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [stocks, setStocks] = useState<Stock[]>(initialStocks);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [categories, setCategories] = useState({
    stocks: ['Lubricants', 'Brake System', 'Filters', 'Electrical', 'Body Parts'],
    services: ['Maintenance', 'AC Services', 'Painting', 'Denting', 'Electrical Work'],
  });
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const addStock = (stock: Stock) => setStocks([...stocks, stock]);
  const updateStock = (stock: Stock) => setStocks(stocks.map((s) => (s.id === stock.id ? stock : s)));
  const deleteStock = (id: string) => setStocks(stocks.filter((s) => s.id !== id));

  const addService = (service: Service) => setServices([...services, service]);
  const updateService = (service: Service) => setServices(services.map((s) => (s.id === service.id ? service : s)));
  const deleteService = (id: string) => setServices(services.filter((s) => s.id !== id));

  const addCustomer = (customer: Customer) => setCustomers([...customers, customer]);
  const updateCustomer = (customer: Customer) => setCustomers(customers.map((c) => (c.id === customer.id ? customer : c)));
  const deleteCustomer = (id: string) => setCustomers(customers.filter((c) => c.id !== id));

  const addInvoice = (invoice: Invoice) => setInvoices([...invoices, invoice]);
  const updateInvoice = (invoice: Invoice) => setInvoices(invoices.map((i) => (i.id === invoice.id ? invoice : i)));
  const deleteInvoice = (id: string) => setInvoices(invoices.filter((i) => i.id !== id));

  const addCategory = (type: 'stocks' | 'services', category: string) => {
    setCategories({
      ...categories,
      [type]: [...categories[type], category],
    });
  };

  const deleteCategory = (type: 'stocks' | 'services', category: string) => {
    setCategories({
      ...categories,
      [type]: categories[type].filter((c) => c !== category),
    });
  };

  const login = (email: string) => setCurrentUser(email);
  const logout = () => setCurrentUser(null);

  return (
    <AppContext.Provider
      value={{
        stocks,
        services,
        customers,
        invoices,
        categories,
        currentUser,
        addStock,
        updateStock,
        deleteStock,
        addService,
        updateService,
        deleteService,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        addCategory,
        deleteCategory,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
