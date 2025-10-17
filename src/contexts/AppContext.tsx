import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { Stock, Service, Customer, Invoice } from '../types';

interface AppContextType {
  currentUser: string | null;
  setCurrentUser: (user: string | null) => void; 
  logout: () => Promise<void>;
  stocks: Stock[];
  services: Service[];
  customers: Customer[];
  invoices: Invoice[];
  categories: { stocks: string[]; services: string[] };
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
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<Stock[]>(initialStocks);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [categories, setCategories] = useState({
    stocks: ['Lubricants', 'Brake System', 'Filters', 'Electrical', 'Body Parts'],
    services: ['Maintenance', 'AC Services', 'Painting', 'Denting', 'Electrical Work'],
  });

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUser(user.email || user.uid);
      else setCurrentUser(null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // CRUD operations
  const addStock = (stock: Stock) => setStocks([...stocks, stock]);
  const updateStock = (stock: Stock) =>
    setStocks(stocks.map((s) => (s.id === stock.id ? stock : s)));
  const deleteStock = (id: string) => setStocks(stocks.filter((s) => s.id !== id));

  const addService = (service: Service) => setServices([...services, service]);
  const updateService = (service: Service) =>
    setServices(services.map((s) => (s.id === service.id ? service : s)));
  const deleteService = (id: string) => setServices(services.filter((s) => s.id !== id));

  const addCustomer = (customer: Customer) => setCustomers([...customers, customer]);
  const updateCustomer = (customer: Customer) =>
    setCustomers(customers.map((c) => (c.id === customer.id ? customer : c)));
  const deleteCustomer = (id: string) => setCustomers(customers.filter((c) => c.id !== id));

  const addInvoice = (invoice: Invoice) => setInvoices([...invoices, invoice]);
  const updateInvoice = (invoice: Invoice) =>
    setInvoices(invoices.map((i) => (i.id === invoice.id ? invoice : i)));
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        logout,
        stocks,
        services,
        customers,
        invoices,
        categories,
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
