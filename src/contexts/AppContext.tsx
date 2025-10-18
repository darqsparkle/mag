import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { Stock, Service, Customer, Invoice } from '../types';

interface GarageDetails {
  companyName: string;
  gstNumber: string;
  phoneNumber: string;
  fullAddress: string;
  addressLineOne: string;
  addressLineTwo: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  panNumber: string;
}

interface AppContextType {
  currentUser: string | null;
  setCurrentUser: (user: string | null) => void; 
  logout: () => Promise<void>;
  stocks: Stock[];
  services: Service[];
  customers: Customer[];
  invoices: Invoice[];
  categories: { stocks: string[]; services: string[] };
  garageDetails: GarageDetails;
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
  updateGarageDetails: (details: GarageDetails) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultGarageDetails: GarageDetails = {
  companyName: '',
  gstNumber: '',
  phoneNumber: '',
  fullAddress: '',
  addressLineOne: '',
  addressLineTwo: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  panNumber: '',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [garageDetails, setGarageDetails] = useState<GarageDetails>(defaultGarageDetails);
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

  // Load data from in-memory state on mount
  useEffect(() => {
    // You can later integrate with Firebase Firestore here
    // For now, using in-memory state as per artifact restrictions
  }, [currentUser]);

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Garage Details operations
  const updateGarageDetails = (details: GarageDetails) => {
    setGarageDetails(details);
    // TODO: Save to Firebase Firestore
    console.log('Garage details updated:', details);
  };

  // CRUD operations for Stocks
  const addStock = (stock: Stock) => {
    setStocks([...stocks, stock]);
    // TODO: Save to Firebase Firestore
  };

  const updateStock = (stock: Stock) => {
    setStocks(stocks.map((s) => (s.id === stock.id ? stock : s)));
    // TODO: Update in Firebase Firestore
  };

  const deleteStock = (id: string) => {
    setStocks(stocks.filter((s) => s.id !== id));
    // TODO: Delete from Firebase Firestore
  };

  // CRUD operations for Services
  const addService = (service: Service) => {
    setServices([...services, service]);
    // TODO: Save to Firebase Firestore
  };

  const updateService = (service: Service) => {
    setServices(services.map((s) => (s.id === service.id ? service : s)));
    // TODO: Update in Firebase Firestore
  };

  const deleteService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
    // TODO: Delete from Firebase Firestore
  };

  // CRUD operations for Customers
  const addCustomer = (customer: Customer) => {
    setCustomers([...customers, customer]);
    // TODO: Save to Firebase Firestore
  };

  const updateCustomer = (customer: Customer) => {
    setCustomers(customers.map((c) => (c.id === customer.id ? customer : c)));
    // TODO: Update in Firebase Firestore
  };

  const deleteCustomer = (id: string) => {
    setCustomers(customers.filter((c) => c.id !== id));
    // TODO: Delete from Firebase Firestore
  };

  // CRUD operations for Invoices
  const addInvoice = (invoice: Invoice) => {
    setInvoices([...invoices, invoice]);
    // TODO: Save to Firebase Firestore
  };

  const updateInvoice = (invoice: Invoice) => {
    setInvoices(invoices.map((i) => (i.id === invoice.id ? invoice : i)));
    // TODO: Update in Firebase Firestore
  };

  const deleteInvoice = (id: string) => {
    setInvoices(invoices.filter((i) => i.id !== id));
    // TODO: Delete from Firebase Firestore
  };

  // Category operations
  const addCategory = (type: 'stocks' | 'services', category: string) => {
    setCategories({
      ...categories,
      [type]: [...categories[type], category],
    });
    // TODO: Save to Firebase Firestore
  };

  const deleteCategory = (type: 'stocks' | 'services', category: string) => {
    setCategories({
      ...categories,
      [type]: categories[type].filter((c) => c !== category),
    });
    // TODO: Delete from Firebase Firestore
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
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
        garageDetails,
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
        updateGarageDetails,
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