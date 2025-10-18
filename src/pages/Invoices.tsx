import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Eye, Edit2, X, Printer } from "lucide-react";
import {
  addInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoicesPaginated,
  clearInvoicesCache,
  calculateInvoiceTotals,
  generateInvoiceNumber,
  Invoice,
  InvoiceStockItem,
  InvoiceServiceItem,
  AdditionalCharge,
  checkOldInvoices,
  migrateOldInvoices,
  MonthProfit,
  getMonthProfit,
  recalculateAllProfits,
  calculateInvoiceProfit,
  storeProfitData,
} from "../services/InvoiceService";
import {
  getCustomersPaginated,
  getVehiclesByCustomer,
  CustomerWithVehicles,
  Vehicle,
} from "../services/CustomerService";
import {
  getCategories,
  getStocksByCategory,
  getStocksByCategoryForInvoice,
  Stock,
} from "../services/stockServices";
import {
  getServiceCategories,
  getServicesByCategory,
  getServicesByCategoryForInvoice,
  Service,
} from "../services/servicesServices";
import { DownloadInvoice } from "../components/DownloadInvoice";

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

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<CustomerWithVehicles[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stockCategories, setStockCategories] = useState<any[]>([]);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [downloadingInvoice, setDownloadingInvoice] = useState<Invoice | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalType, setItemModalType] = useState<"stock" | "service">(
    "stock"
  );
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20;

  //migration
  // Add these new state variables
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState({
    current: 0,
    total: 0,
  });
  const [showMigrationUI, setShowMigrationUI] = useState(false);
  const [oldInvoicesCount, setOldInvoicesCount] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    customerId: "",
    vehicleId: "",
    invoiceType: "GST" as "GST" | "Non-GST",
    stocks: [] as InvoiceStockItem[],
    services: [] as InvoiceServiceItem[],
    discount: 0,
    additionalCharges: [] as AdditionalCharge[],
    note: "",
  });

  // Item selection state
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoryItems, setCategoryItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemQuantity, setItemQuantity] = useState("1");

  // Additional charges state
  const [chargeDescription, setChargeDescription] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");

  //monthly profit

  const [selectedProfitMonth, setSelectedProfitMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [monthProfit, setMonthProfit] = useState<MonthProfit | null>(null);
  const [isCalculatingProfit, setIsCalculatingProfit] = useState(false);
  const [profitProgress, setProfitProgress] = useState({
    current: 0,
    total: 0,
  });
  const [showProfitLegend, setShowProfitLegend] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
    loadCustomers();
    loadCategories();
  }, []);
  useEffect(() => {
    const checkForOldInvoices = async () => {
      const count = await checkOldInvoices();
      setOldInvoicesCount(count);
      if (count > 0) {
        setShowMigrationUI(true);
      }
    };

    checkForOldInvoices();
  }, []);

  useEffect(() => {
    loadMonthProfit(selectedProfitMonth);
  }, [selectedProfitMonth]);

  const handleMigrateInvoices = async () => {
    if (!confirm(`Migrate ${oldInvoicesCount} invoices to new structure?`))
      return;

    try {
      setIsMigrating(true);

      const result = await migrateOldInvoices((current, total) => {
        setMigrationProgress({ current, total });
      });

      alert(
        `Migration complete!\nSuccess: ${result.success}\nFailed: ${result.failed}`
      );
      setShowMigrationUI(false);
      setOldInvoicesCount(0);
      clearInvoicesCache();
      await loadData(1);
    } catch (error) {
      console.error("Migration error:", error);
      alert("Migration failed. Please try again.");
    } finally {
      setIsMigrating(false);
    }
  };

  const loadData = async (page: number = 1) => {
    try {
      setLoading(true);
      const paginatedData = await getInvoicesPaginated(page, PAGE_SIZE);
      setInvoices(paginatedData.invoices);
      setTotalInvoices(paginatedData.totalCount);
      setHasMore(paginatedData.hasMore);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error loading invoices:", error);
      alert("Error loading invoices");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const paginatedData = await getCustomersPaginated(1, 1000);
      setCustomers(paginatedData.customers);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const stockCats = await getCategories();
      const serviceCats = await getServiceCategories();
      setStockCategories(stockCats);
      setServiceCategories(serviceCats);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadMonthProfit = async (yearMonth: string) => {
    try {
      const profit = await getMonthProfit(yearMonth);
      setMonthProfit(profit);
    } catch (error) {
      console.error("Error loading profit:", error);
    }
  };

  const handleCalculateProfit = async () => {
    if (
      !confirm(
        "Calculate profit for all existing invoices? This may take some time."
      )
    ) {
      return;
    }

    try {
      setIsCalculatingProfit(true);
      const result = await recalculateAllProfits((current, total) => {
        setProfitProgress({ current, total });
      });

      alert(
        `Profit calculation complete!\nSuccess: ${result.success}\nFailed: ${result.failed}`
      );
      await loadMonthProfit(selectedProfitMonth);
    } catch (error) {
      console.error("Error calculating profit:", error);
      alert("Failed to calculate profits");
    } finally {
      setIsCalculatingProfit(false);
    }
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    const currentDate = new Date(selectedProfitMonth + "-01");
    if (direction === "prev") {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    const newMonth = currentDate.toISOString().slice(0, 7);
    setSelectedProfitMonth(newMonth);
    loadMonthProfit(newMonth);
  };

  const handleCustomerChange = async (customerId: string) => {
    setFormData({ ...formData, customerId, vehicleId: "" });
    if (customerId) {
      try {
        const customerVehicles = await getVehiclesByCustomer(customerId);
        setVehicles(customerVehicles);
      } catch (error) {
        console.error("Error loading vehicles:", error);
      }
    } else {
      setVehicles([]);
    }
  };

  const handleOpenModal = async (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        customerId: invoice.customerId,
        vehicleId: invoice.vehicleId,
        invoiceType: invoice.invoiceType,
        stocks: invoice.stocks,
        services: invoice.services,
        discount: invoice.discount,
        additionalCharges: invoice.additionalCharges,
        note: invoice.note,
      });

      // Load vehicles for the customer
      const customerVehicles = await getVehiclesByCustomer(invoice.customerId);
      setVehicles(customerVehicles);
    } else {
      setEditingInvoice(null);
      const nextInvoiceNum = await generateInvoiceNumber();
      setFormData({
        invoiceNumber: nextInvoiceNum,
        date: new Date().toISOString().split("T")[0],
        customerId: "",
        vehicleId: "",
        invoiceType: "GST",
        stocks: [],
        services: [],
        discount: 0,
        additionalCharges: [],
        note: "",
      });
      setVehicles([]);
    }
    setIsModalOpen(true);
  };

  const handleOpenItemModal = (type: "stock" | "service") => {
    setItemModalType(type);
    setSelectedCategory("");
    setCategoryItems([]);
    setItemSearch("");
    setSelectedItem(null);
    setItemQuantity("1");
    setIsItemModalOpen(true);
  };

  const handleCategorySelect = async (categoryName: string) => {
    setSelectedCategory(categoryName);
    setItemSearch("");
    setSelectedItem(null);

    try {
      if (itemModalType === "stock") {
        const items = await getStocksByCategoryForInvoice(categoryName);
        setCategoryItems(items);
      } else {
        // Use the new method that handles both structures
        const items = await getServicesByCategoryForInvoice(categoryName);
        setCategoryItems(items);
      }
    } catch (error) {
      console.error("Error loading category items:", error);
      alert("Error loading items. Please try again.");
    }
  };

  const handleAddItem = () => {
    if (!selectedItem) return;

    const quantity = parseFloat(itemQuantity) || 1;

    if (itemModalType === "stock") {
      const stock = selectedItem as Stock;
      const amount = stock.sellingPrice * quantity;
      const newItem: InvoiceStockItem = {
        stockId: stock.id!,
        name: stock.productName,
        qty: quantity,
        price: stock.sellingPrice,
        gst: stock.gst,
        amount,
      };
      setFormData({ ...formData, stocks: [...formData.stocks, newItem] });
    } else {
      const service = selectedItem as Service;
      const amount = service.labour * quantity;
      const newItem: InvoiceServiceItem = {
        serviceId: service.id!,
        name: service.serviceName,
        qty: quantity,
        price: service.labour,
        gst: service.gst,
        amount,
      };
      setFormData({ ...formData, services: [...formData.services, newItem] });
    }

    setIsItemModalOpen(false);
    setSelectedCategory("");
    setCategoryItems([]);
    setItemSearch("");
    setSelectedItem(null);
    setItemQuantity("1");
  };

  const handleRemoveStock = (index: number) => {
    const newStocks = formData.stocks.filter((_, i) => i !== index);
    setFormData({ ...formData, stocks: newStocks });
  };

  const handleRemoveService = (index: number) => {
    const newServices = formData.services.filter((_, i) => i !== index);
    setFormData({ ...formData, services: newServices });
  };

  const handleAddCharge = () => {
    if (!chargeDescription || !chargeAmount) return;

    const newCharge: AdditionalCharge = {
      description: chargeDescription,
      amount: parseFloat(chargeAmount),
    };

    setFormData({
      ...formData,
      additionalCharges: [...formData.additionalCharges, newCharge],
    });

    setChargeDescription("");
    setChargeAmount("");
  };

  const handleRemoveCharge = (index: number) => {
    const newCharges = formData.additionalCharges.filter((_, i) => i !== index);
    setFormData({ ...formData, additionalCharges: newCharges });
  };

  const calculateTotals = () => {
    return calculateInvoiceTotals(
      formData.stocks,
      formData.services,
      formData.discount,
      formData.additionalCharges,
      formData.invoiceType
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId || !formData.vehicleId) {
      alert("Please select a customer and vehicle");
      return;
    }

    if (formData.stocks.length === 0 && formData.services.length === 0) {
      alert("Please add at least one stock or service item");
      return;
    }

    try {
      setLoading(true);

      const customer = customers.find((c) => c.id === formData.customerId)!;
      const vehicle = vehicles.find((v) => v.id === formData.vehicleId)!;
      const totals = calculateTotals();

      const invoiceData: Invoice = {
        id: editingInvoice?.id,
        customerId: customer.id!,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerGst: customer.gstNumber,
        vehicleId: vehicle.id!,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleKilometer: vehicle.kilometer,
        invoiceType: formData.invoiceType,
        invoiceNumber: formData.invoiceNumber,
        date: formData.date,
        stocks: formData.stocks,
        services: formData.services,
        discount: formData.discount,
        additionalCharges: formData.additionalCharges,
        note: formData.note,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        gstAmount: totals.gstAmount,
        totalAmount: totals.totalAmount,
      };

      // --- Save or update invoice ---
      let savedInvoiceId: string;

      if (editingInvoice) {
        await updateInvoice(invoiceData);
        savedInvoiceId = editingInvoice.id!;
      } else {
        savedInvoiceId = await addInvoice(invoiceData); // ✅ Capture returned Firestore ID
        invoiceData.id = savedInvoiceId; // ✅ Assign for profit tracking
      }

      // --- Clear cache and reload invoice list ---
      clearInvoicesCache();
      await loadData(currentPage);
      setIsModalOpen(false);

      // --- 🔹 Profit Calculation and Storage ---
      try {
        const { serviceProfit, stockProfit } = await calculateInvoiceProfit(
          invoiceData
        );
        await storeProfitData(invoiceData, serviceProfit, stockProfit);

        // Refresh monthly profit if relevant
        if (invoiceData.date.startsWith(selectedProfitMonth)) {
          await loadMonthProfit(selectedProfitMonth);
        }
      } catch (error) {
        console.error("Error calculating profit for new invoice:", error);
        // Don’t block invoice creation if profit saving fails
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert("Error saving invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      setLoading(true);
      await deleteInvoice(invoice.id!, invoice.date);
      clearInvoicesCache();
      await loadData(currentPage);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Error deleting invoice");
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMonth = selectedMonth
      ? invoice.date.startsWith(selectedMonth)
      : true;

    return matchesSearch && matchesMonth;
  });

  const filteredCategoryItems = categoryItems.filter((item) => {
    const searchLower = itemSearch.toLowerCase();
    if (itemModalType === "stock") {
      return (
        item.productName.toLowerCase().includes(searchLower) ||
        item.partNumber.toLowerCase().includes(searchLower)
      );
    } else {
      return item.serviceName.toLowerCase().includes(searchLower);
    }
  });

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Invoices</h2>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            Create Invoice
          </button>
        </div>
        {showMigrationUI && oldInvoicesCount > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <svg
                    className="h-6 w-6 text-yellow-400 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-yellow-800">
                    Invoice Structure Update Required
                  </h3>
                </div>
                <p className="text-yellow-700 mb-4">
                  Found {oldInvoicesCount} invoices using the old storage
                  structure. Click migrate to organize them by month for better
                  performance.
                </p>

                {isMigrating && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-yellow-700 mb-2">
                      <span>Migrating invoices...</span>
                      <span>
                        {migrationProgress.current} / {migrationProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-yellow-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (migrationProgress.current /
                              migrationProgress.total) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleMigrateInvoices}
                    disabled={isMigrating}
                    className="px-6 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMigrating ? "Migrating..." : "Migrate Now"}
                  </button>
                  <button
                    onClick={() => setShowMigrationUI(false)}
                    disabled={isMigrating}
                    className="px-6 py-2 bg-white text-yellow-800 font-semibold rounded-lg border-2 border-yellow-400 hover:bg-yellow-50 transition-colors disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              Monthly Profit Overview
            </h3>
            <button
              onClick={handleCalculateProfit}
              disabled={isCalculatingProfit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {isCalculatingProfit
                ? "Calculating..."
                : "Recalculate All Profits"}
            </button>
          </div>

          {/* Month Selector */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => handleMonthChange("prev")}
              className="p-2 hover:bg-green-100 rounded-lg"
            >
              ←
            </button>
            <input
              type="month"
              value={selectedProfitMonth}
              onChange={(e) => {
                setSelectedProfitMonth(e.target.value);
                loadMonthProfit(e.target.value);
              }}
              className="px-4 py-2 border rounded-lg"
            />
            <button
              onClick={() => handleMonthChange("next")}
              className="p-2 hover:bg-green-100 rounded-lg"
            >
              →
            </button>
          </div>

          {/* Progress Bar */}
          {isCalculatingProfit && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Calculating profits...</span>
                <span>
                  {profitProgress.current} / {profitProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      (profitProgress.current / profitProgress.total) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Profit Display */}
          {monthProfit ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 mb-1">Service Profit</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{monthProfit.serviceProfit.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 mb-1">Stock Profit</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₹{monthProfit.stockProfit.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 mb-1">Total Profit</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{monthProfit.totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">
              No profit data available. Click "Recalculate All Profits" to
              generate.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice number, customer, or vehicle..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-blue-600">
                    #{invoice.invoiceNumber}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      invoice.invoiceType === "GST"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {invoice.invoiceType}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800">
                  {invoice.customerName}
                </p>
                <p className="text-xs text-gray-600">{invoice.vehicleNumber}</p>
              </div>
              <div className="flex items-center gap-4 mt-3 sm:mt-0">
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    ₹{invoice.totalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600">{invoice.date}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingInvoice(invoice)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Invoice"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => setDownloadingInvoice(invoice)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Download Invoice"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={() => handleOpenModal(invoice)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Edit Invoice"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteInvoice(invoice)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Invoice"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredInvoices.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No invoices found. Create your first invoice!
            </div>
          )}
        </div>

        {totalInvoices > PAGE_SIZE && (
          <div className="flex justify-between items-center mt-6 pt-6 border-t">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(currentPage * PAGE_SIZE, totalInvoices)} of{" "}
              {totalInvoices} invoices
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadData(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
                Page {currentPage}
              </span>
              <button
                onClick={() => loadData(currentPage + 1)}
                disabled={!hasMore || loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h3 className="text-xl font-bold text-white">
                {editingInvoice ? "Edit Invoice" : "Create Invoice"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:opacity-80"
              >
                <X size={24} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-6 max-h-[80vh] overflow-y-auto"
            >
              {/* Invoice Type Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Invoice Type
                </label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, invoiceType: "GST" })
                    }
                    className={`px-4 py-2 rounded-md font-medium transition-all ${
                      formData.invoiceType === "GST"
                        ? "bg-green-600 text-white shadow-md"
                        : "text-gray-600"
                    }`}
                  >
                    GST
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, invoiceType: "Non-GST" })
                    }
                    className={`px-4 py-2 rounded-md font-medium transition-all ${
                      formData.invoiceType === "Non-GST"
                        ? "bg-gray-600 text-white shadow-md"
                        : "text-gray-600"
                    }`}
                  >
                    Non-GST
                  </button>
                </div>
              </div>

              {/* Invoice Number and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoiceNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>

              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer *
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Choose a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Vehicle *
                </label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleId: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                  disabled={!formData.customerId}
                >
                  <option value="">Choose a vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Items
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenItemModal("stock")}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      + Add Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenItemModal("service")}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      + Add Service
                    </button>
                  </div>
                </div>

                {/* Stocks Table */}
                {formData.stocks.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Stocks
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Item</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Rate</th>
                            <th className="px-3 py-2 text-right">GST</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.stocks.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2 font-medium">
                                {item.name}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {item.qty}
                              </td>
                              <td className="px-3 py-2 text-right">
                                ₹{item.price.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {item.gst}%
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                ₹{item.amount.toFixed(2)}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStock(index)}
                                  className="text-red-600 hover:bg-red-50 p-1 rounded"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Services Table */}
                {formData.services.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Services
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-green-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Service</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Rate</th>
                            <th className="px-3 py-2 text-right">GST</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.services.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2 font-medium">
                                {item.name}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {item.qty}
                              </td>
                              <td className="px-3 py-2 text-right">
                                ₹{item.price.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {item.gst}%
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                ₹{item.amount.toFixed(2)}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveService(index)}
                                  className="text-red-600 hover:bg-red-50 p-1 rounded"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {formData.stocks.length === 0 &&
                  formData.services.length === 0 && (
                    <p className="text-center py-4 text-gray-500 text-sm border rounded-lg">
                      No items added yet
                    </p>
                  )}
              </div>

              {/* Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount (%)
                </label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Additional Charges */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Charges
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={chargeDescription}
                    onChange={(e) => setChargeDescription(e.target.value)}
                    placeholder="Description"
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <input
                    type="number"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                    placeholder="Amount"
                    step="0.01"
                    className="w-32 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCharge}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>

                {formData.additionalCharges.length > 0 && (
                  <div className="space-y-2">
                    {formData.additionalCharges.map((charge, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm">{charge.description}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            ₹{charge.amount.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCharge(index)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Totals Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    ₹{totals.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Discount ({formData.discount}%):
                  </span>
                  <span className="font-medium text-red-600">
                    -₹{totals.discountAmount.toFixed(2)}
                  </span>
                </div>
                {formData.invoiceType === "GST" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST:</span>
                    <span className="font-medium">
                      ₹{totals.gstAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {formData.additionalCharges.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Additional Charges:</span>
                    <span className="font-medium">
                      ₹
                      {formData.additionalCharges
                        .reduce((sum, c) => sum + c.amount, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-bold text-gray-800">Total Amount:</span>
                  <span className="font-bold text-lg text-green-600">
                    ₹{totals.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : editingInvoice
                    ? "Update Invoice"
                    : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Selection Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                Select {itemModalType === "stock" ? "Stock" : "Service"}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-white hover:opacity-80"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              {/* Category Selection */}
              {!selectedCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Category
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(itemModalType === "stock"
                      ? stockCategories
                      : serviceCategories
                    ).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelect(cat.name)}
                        className="p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                      >
                        <p className="font-medium text-gray-800">{cat.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Items List */}
              {selectedCategory && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("");
                      setCategoryItems([]);
                      setSelectedItem(null);
                    }}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    ← Back to categories
                  </button>

                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder={`Search ${
                        itemModalType === "stock" ? "stocks" : "services"
                      }...`}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredCategoryItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                          selectedItem?.id === item.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <p className="font-medium text-gray-800">
                          {itemModalType === "stock"
                            ? item.productName
                            : item.serviceName}
                        </p>
                        {itemModalType === "stock" && (
                          <p className="text-xs text-gray-600">
                            Part: {item.partNumber}
                          </p>
                        )}
                        <p className="text-sm text-green-600 font-medium mt-1">
                          ₹
                          {itemModalType === "stock"
                            ? item.sellingPrice
                            : item.labour}{" "}
                          | GST: {item.gst}%
                        </p>
                      </button>
                    ))}
                  </div>

                  {selectedItem && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(e.target.value)}
                        min="0.01"
                        step="0.01"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedItem}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Item
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Invoice Details</h3>
              <button
                onClick={() => setViewingInvoice(null)}
                className="text-white hover:opacity-80"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Header */}
              <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-3">
                    Invoice Info
                  </h4>
                  <p className="text-2xl font-bold text-blue-600 mb-1">
                    #{viewingInvoice.invoiceNumber}
                  </p>
                  <p className="text-sm text-gray-600">{viewingInvoice.date}</p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${
                      viewingInvoice.invoiceType === "GST"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {viewingInvoice.invoiceType}
                  </span>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-semibold text-gray-600 mb-3">
                    Total Amount
                  </h4>
                  <p className="text-3xl font-bold text-green-600">
                    ₹{viewingInvoice.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Customer & Vehicle */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">
                    Customer
                  </h4>
                  <p className="font-medium text-gray-800">
                    {viewingInvoice.customerName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {viewingInvoice.customerPhone}
                  </p>
                  <p className="text-sm text-gray-600">
                    {viewingInvoice.customerAddress}
                  </p>
                  {viewingInvoice.customerGst && (
                    <p className="text-sm text-gray-600">
                      GST: {viewingInvoice.customerGst}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">
                    Vehicle
                  </h4>
                  <p className="font-medium text-gray-800">
                    {viewingInvoice.vehicleNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    {viewingInvoice.vehicleMake} {viewingInvoice.vehicleModel}
                  </p>
                  <p className="text-sm text-gray-600">
                    KM: {viewingInvoice.vehicleKilometer}
                  </p>
                </div>
              </div>

              {/* Items */}
              {viewingInvoice.stocks.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Stocks
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-4 py-3 text-left">Item</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-right">Rate</th>
                          <th className="px-4 py-3 text-right">GST</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>

                      <tbody>
                        {viewingInvoice.stocks.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-3 font-medium">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-right">{item.qty}</td>
                            <td className="px-4 py-3 text-right">
                              ₹{item.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.gst}%
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              ₹{item.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewingInvoice.services.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Services
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-green-50">
                        <tr>
                          <th className="px-4 py-3 text-left">Service</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-right">Rate</th>
                          <th className="px-4 py-3 text-right">GST</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingInvoice.services.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-3 font-medium">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-right">{item.qty}</td>
                            <td className="px-4 py-3 text-right">
                              ₹{item.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.gst}%
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              ₹{item.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    ₹{viewingInvoice.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Discount ({viewingInvoice.discount}%):
                  </span>
                  <span className="font-medium text-red-600">
                    -₹{viewingInvoice.discountAmount.toFixed(2)}
                  </span>
                </div>
                {viewingInvoice.invoiceType === "GST" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST:</span>
                    <span className="font-medium">
                      ₹{viewingInvoice.gstAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {viewingInvoice.additionalCharges.length > 0 && (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Additional Charges:
                      </p>
                      {viewingInvoice.additionalCharges.map((charge, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-sm mb-1"
                        >
                          <span className="text-gray-600">
                            {charge.description}:
                          </span>
                          <span className="font-medium">
                            ₹{charge.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-bold text-gray-800">Total Amount:</span>
                  <span className="font-bold text-xl text-green-600">
                    ₹{viewingInvoice.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {viewingInvoice.note && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Note
                  </h4>
                  <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                    {viewingInvoice.note}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Download Invoice Modal */}
      {downloadingInvoice && (
        <DownloadInvoice
          invoice={downloadingInvoice}
          onClose={() => setDownloadingInvoice(null)}
        />
      )}
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { Plus, Search, Trash2, Eye, Edit2, X } from "lucide-react";
// import {
//   addInvoice,
//   updateInvoice,
//   deleteInvoice,
//   getInvoicesPaginated,
//   clearInvoicesCache,
//   calculateInvoiceTotals,
//   generateInvoiceNumber,
//   Invoice,
//   InvoiceStockItem,
//   InvoiceServiceItem,
//   AdditionalCharge,
//   checkOldInvoices,
//   migrateOldInvoices,
//   MonthProfit,
//   getMonthProfit,
//   recalculateAllProfits,
//   calculateInvoiceProfit,
//   storeProfitData,
// } from "../services/InvoiceService";
// import {
//   getCustomersPaginated,
//   getVehiclesByCustomer,
//   CustomerWithVehicles,
//   Vehicle,
// } from "../services/CustomerService";
// import {
//   getCategories,
//   getStocksByCategory,
//   getStocksByCategoryForInvoice,
//   Stock,
// } from "../services/stockServices";
// import {
//   getServiceCategories,
//   getServicesByCategory,
//   getServicesByCategoryForInvoice,
//   Service,
// } from "../services/servicesServices";

// const sessionCache = {
//   data: {} as any,
//   set(key: string, value: any) {
//     this.data[key] = value;
//   },
//   get(key: string) {
//     return this.data[key];
//   },
//   clear() {
//     this.data = {};
//   },
// };

// export function Invoices() {
//   const [invoices, setInvoices] = useState<Invoice[]>([]);
//   const [customers, setCustomers] = useState<CustomerWithVehicles[]>([]);
//   const [vehicles, setVehicles] = useState<Vehicle[]>([]);
//   const [stockCategories, setStockCategories] = useState<any[]>([]);
//   const [serviceCategories, setServiceCategories] = useState<any[]>([]);

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isItemModalOpen, setIsItemModalOpen] = useState(false);
//   const [itemModalType, setItemModalType] = useState<"stock" | "service">(
//     "stock"
//   );
//   const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
//   const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedMonth, setSelectedMonth] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalInvoices, setTotalInvoices] = useState(0);
//   const [hasMore, setHasMore] = useState(false);
//   const PAGE_SIZE = 20;

//   //migration
//   // Add these new state variables
//   const [isMigrating, setIsMigrating] = useState(false);
//   const [migrationProgress, setMigrationProgress] = useState({
//     current: 0,
//     total: 0,
//   });
//   const [showMigrationUI, setShowMigrationUI] = useState(false);
//   const [oldInvoicesCount, setOldInvoicesCount] = useState(0);

//   // Form state
//   const [formData, setFormData] = useState({
//     invoiceNumber: "",
//     date: new Date().toISOString().split("T")[0],
//     customerId: "",
//     vehicleId: "",
//     invoiceType: "GST" as "GST" | "Non-GST",
//     stocks: [] as InvoiceStockItem[],
//     services: [] as InvoiceServiceItem[],
//     discount: 0,
//     additionalCharges: [] as AdditionalCharge[],
//     note: "",
//   });

//   // Item selection state
//   const [selectedCategory, setSelectedCategory] = useState("");
//   const [categoryItems, setCategoryItems] = useState<any[]>([]);
//   const [itemSearch, setItemSearch] = useState("");
//   const [selectedItem, setSelectedItem] = useState<any>(null);
//   const [itemQuantity, setItemQuantity] = useState("1");

//   // Additional charges state
//   const [chargeDescription, setChargeDescription] = useState("");
//   const [chargeAmount, setChargeAmount] = useState("");

//   //monthly profit

//   const [selectedProfitMonth, setSelectedProfitMonth] = useState(
//   new Date().toISOString().slice(0, 7) // YYYY-MM format
// );
// const [monthProfit, setMonthProfit] = useState<MonthProfit | null>(null);
// const [isCalculatingProfit, setIsCalculatingProfit] = useState(false);
// const [profitProgress, setProfitProgress] = useState({ current: 0, total: 0 });
// const [showProfitLegend, setShowProfitLegend] = useState(false);

//   // Load initial data
//   useEffect(() => {
//     loadData();
//     loadCustomers();
//     loadCategories();
//   }, []);
//   useEffect(() => {
//     const checkForOldInvoices = async () => {
//       const count = await checkOldInvoices();
//       setOldInvoicesCount(count);
//       if (count > 0) {
//         setShowMigrationUI(true);
//       }
//     };

//     checkForOldInvoices();
//   }, []);

//   useEffect(() => {
//   loadMonthProfit(selectedProfitMonth);
// }, [selectedProfitMonth]);

//   const handleMigrateInvoices = async () => {
//     if (!confirm(`Migrate ${oldInvoicesCount} invoices to new structure?`))
//       return;

//     try {
//       setIsMigrating(true);

//       const result = await migrateOldInvoices((current, total) => {
//         setMigrationProgress({ current, total });
//       });

//       alert(
//         `Migration complete!\nSuccess: ${result.success}\nFailed: ${result.failed}`
//       );
//       setShowMigrationUI(false);
//       setOldInvoicesCount(0);
//       clearInvoicesCache();
//       await loadData(1);
//     } catch (error) {
//       console.error("Migration error:", error);
//       alert("Migration failed. Please try again.");
//     } finally {
//       setIsMigrating(false);
//     }
//   };

//   const loadData = async (page: number = 1) => {
//     try {
//       setLoading(true);
//       const paginatedData = await getInvoicesPaginated(page, PAGE_SIZE);
//       setInvoices(paginatedData.invoices);
//       setTotalInvoices(paginatedData.totalCount);
//       setHasMore(paginatedData.hasMore);
//       setCurrentPage(page);
//     } catch (error) {
//       console.error("Error loading invoices:", error);
//       alert("Error loading invoices");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadCustomers = async () => {
//     try {
//       const paginatedData = await getCustomersPaginated(1, 1000);
//       setCustomers(paginatedData.customers);
//     } catch (error) {
//       console.error("Error loading customers:", error);
//     }
//   };

//   const loadCategories = async () => {
//     try {
//       const stockCats = await getCategories();
//       const serviceCats = await getServiceCategories();
//       setStockCategories(stockCats);
//       setServiceCategories(serviceCats);
//     } catch (error) {
//       console.error("Error loading categories:", error);
//     }
//   };

//   const loadMonthProfit = async (yearMonth: string) => {
//   try {
//     const profit = await getMonthProfit(yearMonth);
//     setMonthProfit(profit);
//   } catch (error) {
//     console.error("Error loading profit:", error);
//   }
// };

// const handleCalculateProfit = async () => {
//   if (!confirm("Calculate profit for all existing invoices? This may take some time.")) {
//     return;
//   }

//   try {
//     setIsCalculatingProfit(true);
//     const result = await recalculateAllProfits((current, total) => {
//       setProfitProgress({ current, total });
//     });

//     alert(`Profit calculation complete!\nSuccess: ${result.success}\nFailed: ${result.failed}`);
//     await loadMonthProfit(selectedProfitMonth);
//   } catch (error) {
//     console.error("Error calculating profit:", error);
//     alert("Failed to calculate profits");
//   } finally {
//     setIsCalculatingProfit(false);
//   }
// };

// const handleMonthChange = (direction: 'prev' | 'next') => {
//   const currentDate = new Date(selectedProfitMonth + "-01");
//   if (direction === 'prev') {
//     currentDate.setMonth(currentDate.getMonth() - 1);
//   } else {
//     currentDate.setMonth(currentDate.getMonth() + 1);
//   }
//   const newMonth = currentDate.toISOString().slice(0, 7);
//   setSelectedProfitMonth(newMonth);
//   loadMonthProfit(newMonth);
// };

//   const handleCustomerChange = async (customerId: string) => {
//     setFormData({ ...formData, customerId, vehicleId: "" });
//     if (customerId) {
//       try {
//         const customerVehicles = await getVehiclesByCustomer(customerId);
//         setVehicles(customerVehicles);
//       } catch (error) {
//         console.error("Error loading vehicles:", error);
//       }
//     } else {
//       setVehicles([]);
//     }
//   };

//   const handleOpenModal = async (invoice?: Invoice) => {
//     if (invoice) {
//       setEditingInvoice(invoice);
//       setFormData({
//         invoiceNumber: invoice.invoiceNumber,
//         date: invoice.date,
//         customerId: invoice.customerId,
//         vehicleId: invoice.vehicleId,
//         invoiceType: invoice.invoiceType,
//         stocks: invoice.stocks,
//         services: invoice.services,
//         discount: invoice.discount,
//         additionalCharges: invoice.additionalCharges,
//         note: invoice.note,
//       });

//       // Load vehicles for the customer
//       const customerVehicles = await getVehiclesByCustomer(invoice.customerId);
//       setVehicles(customerVehicles);
//     } else {
//       setEditingInvoice(null);
//       const nextInvoiceNum = await generateInvoiceNumber();
//       setFormData({
//         invoiceNumber: nextInvoiceNum,
//         date: new Date().toISOString().split("T")[0],
//         customerId: "",
//         vehicleId: "",
//         invoiceType: "GST",
//         stocks: [],
//         services: [],
//         discount: 0,
//         additionalCharges: [],
//         note: "",
//       });
//       setVehicles([]);
//     }
//     setIsModalOpen(true);
//   };

//   const handleOpenItemModal = (type: "stock" | "service") => {
//     setItemModalType(type);
//     setSelectedCategory("");
//     setCategoryItems([]);
//     setItemSearch("");
//     setSelectedItem(null);
//     setItemQuantity("1");
//     setIsItemModalOpen(true);
//   };

//   const handleCategorySelect = async (categoryName: string) => {
//   setSelectedCategory(categoryName);
//   setItemSearch("");
//   setSelectedItem(null);

//   try {
//     if (itemModalType === "stock") {
//       const items = await getStocksByCategoryForInvoice(categoryName);
//       setCategoryItems(items);
//     } else {
//       // Use the new method that handles both structures
//       const items = await getServicesByCategoryForInvoice(categoryName);
//       setCategoryItems(items);
//     }
//   } catch (error) {
//     console.error("Error loading category items:", error);
//     alert("Error loading items. Please try again.");
//   }
// };

//   const handleAddItem = () => {
//     if (!selectedItem) return;

//     const quantity = parseFloat(itemQuantity) || 1;

//     if (itemModalType === "stock") {
//       const stock = selectedItem as Stock;
//       const amount = stock.sellingPrice * quantity;
//       const newItem: InvoiceStockItem = {
//         stockId: stock.id!,
//         name: stock.productName,
//         qty: quantity,
//         price: stock.sellingPrice,
//         gst: stock.gst,
//         amount,
//       };
//       setFormData({ ...formData, stocks: [...formData.stocks, newItem] });
//     } else {
//       const service = selectedItem as Service;
//       const amount = service.labour * quantity;
//       const newItem: InvoiceServiceItem = {
//         serviceId: service.id!,
//         name: service.serviceName,
//         qty: quantity,
//         price: service.labour,
//         gst: service.gst,
//         amount,
//       };
//       setFormData({ ...formData, services: [...formData.services, newItem] });
//     }

//     setIsItemModalOpen(false);
//     setSelectedCategory("");
//     setCategoryItems([]);
//     setItemSearch("");
//     setSelectedItem(null);
//     setItemQuantity("1");
//   };

//   const handleRemoveStock = (index: number) => {
//     const newStocks = formData.stocks.filter((_, i) => i !== index);
//     setFormData({ ...formData, stocks: newStocks });
//   };

//   const handleRemoveService = (index: number) => {
//     const newServices = formData.services.filter((_, i) => i !== index);
//     setFormData({ ...formData, services: newServices });
//   };

//   const handleAddCharge = () => {
//     if (!chargeDescription || !chargeAmount) return;

//     const newCharge: AdditionalCharge = {
//       description: chargeDescription,
//       amount: parseFloat(chargeAmount),
//     };

//     setFormData({
//       ...formData,
//       additionalCharges: [...formData.additionalCharges, newCharge],
//     });

//     setChargeDescription("");
//     setChargeAmount("");
//   };

//   const handleRemoveCharge = (index: number) => {
//     const newCharges = formData.additionalCharges.filter((_, i) => i !== index);
//     setFormData({ ...formData, additionalCharges: newCharges });
//   };

//   const calculateTotals = () => {
//     return calculateInvoiceTotals(
//       formData.stocks,
//       formData.services,
//       formData.discount,
//       formData.additionalCharges,
//       formData.invoiceType
//     );
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//   e.preventDefault();

//   if (!formData.customerId || !formData.vehicleId) {
//     alert("Please select a customer and vehicle");
//     return;
//   }

//   if (formData.stocks.length === 0 && formData.services.length === 0) {
//     alert("Please add at least one stock or service item");
//     return;
//   }

//   try {
//     setLoading(true);

//     const customer = customers.find((c) => c.id === formData.customerId)!;
//     const vehicle = vehicles.find((v) => v.id === formData.vehicleId)!;
//     const totals = calculateTotals();

//     const invoiceData: Invoice = {
//       id: editingInvoice?.id,
//       customerId: customer.id!,
//       customerName: customer.name,
//       customerPhone: customer.phone,
//       customerAddress: customer.address,
//       customerGst: customer.gstNumber,
//       vehicleId: vehicle.id!,
//       vehicleNumber: vehicle.vehicleNumber,
//       vehicleMake: vehicle.make,
//       vehicleModel: vehicle.model,
//       vehicleKilometer: vehicle.kilometer,
//       invoiceType: formData.invoiceType,
//       invoiceNumber: formData.invoiceNumber,
//       date: formData.date,
//       stocks: formData.stocks,
//       services: formData.services,
//       discount: formData.discount,
//       additionalCharges: formData.additionalCharges,
//       note: formData.note,
//       subtotal: totals.subtotal,
//       discountAmount: totals.discountAmount,
//       gstAmount: totals.gstAmount,
//       totalAmount: totals.totalAmount,
//     };

//     // --- Save or update invoice ---
//     let savedInvoiceId: string;

//     if (editingInvoice) {
//       await updateInvoice(invoiceData);
//       savedInvoiceId = editingInvoice.id!;
//     } else {
//       savedInvoiceId = await addInvoice(invoiceData); // ✅ Capture returned Firestore ID
//       invoiceData.id = savedInvoiceId; // ✅ Assign for profit tracking
//     }

//     // --- Clear cache and reload invoice list ---
//     clearInvoicesCache();
//     await loadData(currentPage);
//     setIsModalOpen(false);

//     // --- 🔹 Profit Calculation and Storage ---
//     try {
//       const { serviceProfit, stockProfit } = await calculateInvoiceProfit(invoiceData);
//       await storeProfitData(invoiceData, serviceProfit, stockProfit);

//       // Refresh monthly profit if relevant
//       if (invoiceData.date.startsWith(selectedProfitMonth)) {
//         await loadMonthProfit(selectedProfitMonth);
//       }
//     } catch (error) {
//       console.error("Error calculating profit for new invoice:", error);
//       // Don’t block invoice creation if profit saving fails
//     }

//   } catch (error) {
//     console.error("Error saving invoice:", error);
//     alert("Error saving invoice");
//   } finally {
//     setLoading(false);
//   }
// };

//   const handleDeleteInvoice = async (invoice: Invoice) => {
//     if (!confirm("Are you sure you want to delete this invoice?")) return;

//     try {
//       setLoading(true);
//       await deleteInvoice(invoice.id!, invoice.date);
//       clearInvoicesCache();
//       await loadData(currentPage);
//     } catch (error) {
//       console.error("Error deleting invoice:", error);
//       alert("Error deleting invoice");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filteredInvoices = invoices.filter((invoice) => {
//     const matchesSearch =
//       invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       invoice.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());

//     const matchesMonth = selectedMonth
//       ? invoice.date.startsWith(selectedMonth)
//       : true;

//     return matchesSearch && matchesMonth;
//   });

//   const filteredCategoryItems = categoryItems.filter((item) => {
//     const searchLower = itemSearch.toLowerCase();
//     if (itemModalType === "stock") {
//       return (
//         item.productName.toLowerCase().includes(searchLower) ||
//         item.partNumber.toLowerCase().includes(searchLower)
//       );
//     } else {
//       return item.serviceName.toLowerCase().includes(searchLower);
//     }
//   });

//   const totals = calculateTotals();

//   return (
//     <div className="space-y-6">
//       <div className="bg-white rounded-lg shadow-md p-6">
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
//           <h2 className="text-2xl font-bold text-gray-800">Invoices</h2>
//           <button
//             onClick={() => handleOpenModal()}
//             className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
//           >
//             <Plus size={20} />
//             Create Invoice
//           </button>
//         </div>
//         {showMigrationUI && oldInvoicesCount > 0 && (
//           <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-6">
//             <div className="flex items-start justify-between">
//               <div className="flex-1">
//                 <div className="flex items-center mb-2">
//                   <svg
//                     className="h-6 w-6 text-yellow-400 mr-2"
//                     fill="currentColor"
//                     viewBox="0 0 20 20"
//                   >
//                     <path
//                       fillRule="evenodd"
//                       d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
//                       clipRule="evenodd"
//                     />
//                   </svg>
//                   <h3 className="text-lg font-semibold text-yellow-800">
//                     Invoice Structure Update Required
//                   </h3>
//                 </div>
//                 <p className="text-yellow-700 mb-4">
//                   Found {oldInvoicesCount} invoices using the old storage
//                   structure. Click migrate to organize them by month for better
//                   performance.
//                 </p>

//                 {isMigrating && (
//                   <div className="mb-4">
//                     <div className="flex items-center justify-between text-sm text-yellow-700 mb-2">
//                       <span>Migrating invoices...</span>
//                       <span>
//                         {migrationProgress.current} / {migrationProgress.total}
//                       </span>
//                     </div>
//                     <div className="w-full bg-yellow-200 rounded-full h-2">
//                       <div
//                         className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
//                         style={{
//                           width: `${
//                             (migrationProgress.current /
//                               migrationProgress.total) *
//                             100
//                           }%`,
//                         }}
//                       />
//                     </div>
//                   </div>
//                 )}

//                 <div className="flex gap-3">
//                   <button
//                     onClick={handleMigrateInvoices}
//                     disabled={isMigrating}
//                     className="px-6 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     {isMigrating ? "Migrating..." : "Migrate Now"}
//                   </button>
//                   <button
//                     onClick={() => setShowMigrationUI(false)}
//                     disabled={isMigrating}
//                     className="px-6 py-2 bg-white text-yellow-800 font-semibold rounded-lg border-2 border-yellow-400 hover:bg-yellow-50 transition-colors disabled:opacity-50"
//                   >
//                     Dismiss
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//         <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-md p-6 mb-6">
//   <div className="flex justify-between items-center mb-4">
//     <h3 className="text-lg font-bold text-gray-800">Monthly Profit Overview</h3>
//     <button
//       onClick={handleCalculateProfit}
//       disabled={isCalculatingProfit}
//       className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
//     >
//       {isCalculatingProfit ? "Calculating..." : "Recalculate All Profits"}
//     </button>
//   </div>

//   {/* Month Selector */}
//   <div className="flex items-center justify-center gap-4 mb-4">
//     <button
//       onClick={() => handleMonthChange('prev')}
//       className="p-2 hover:bg-green-100 rounded-lg"
//     >
//       ←
//     </button>
//     <input
//       type="month"
//       value={selectedProfitMonth}
//       onChange={(e) => {
//         setSelectedProfitMonth(e.target.value);
//         loadMonthProfit(e.target.value);
//       }}
//       className="px-4 py-2 border rounded-lg"
//     />
//     <button
//       onClick={() => handleMonthChange('next')}
//       className="p-2 hover:bg-green-100 rounded-lg"
//     >
//       →
//     </button>
//   </div>

//   {/* Progress Bar */}
//   {isCalculatingProfit && (
//     <div className="mb-4">
//       <div className="flex justify-between text-sm text-gray-600 mb-2">
//         <span>Calculating profits...</span>
//         <span>{profitProgress.current} / {profitProgress.total}</span>
//       </div>
//       <div className="w-full bg-gray-200 rounded-full h-2">
//         <div
//           className="bg-green-600 h-2 rounded-full transition-all"
//           style={{
//             width: `${(profitProgress.current / profitProgress.total) * 100}%`
//           }}
//         />
//       </div>
//     </div>
//   )}

//   {/* Profit Display */}
//   {monthProfit ? (
//     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//       <div className="bg-white rounded-lg p-4 shadow">
//         <p className="text-sm text-gray-600 mb-1">Service Profit</p>
//         <p className="text-2xl font-bold text-blue-600">
//           ₹{monthProfit.serviceProfit.toFixed(2)}
//         </p>
//       </div>
//       <div className="bg-white rounded-lg p-4 shadow">
//         <p className="text-sm text-gray-600 mb-1">Stock Profit</p>
//         <p className="text-2xl font-bold text-purple-600">
//           ₹{monthProfit.stockProfit.toFixed(2)}
//         </p>
//       </div>
//       <div className="bg-white rounded-lg p-4 shadow">
//         <p className="text-sm text-gray-600 mb-1">Total Profit</p>
//         <p className="text-2xl font-bold text-green-600">
//           ₹{monthProfit.totalProfit.toFixed(2)}
//         </p>
//       </div>
//     </div>
//   ) : (
//     <p className="text-center text-gray-500">
//       No profit data available. Click "Recalculate All Profits" to generate.
//     </p>
//   )}
// </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//           <div className="relative">
//             <Search
//               className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
//               size={20}
//             />
//             <input
//               type="text"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               placeholder="Search by invoice number, customer, or vehicle..."
//               className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//             />
//           </div>
//           <input
//             type="month"
//             value={selectedMonth}
//             onChange={(e) => setSelectedMonth(e.target.value)}
//             className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//           />
//         </div>

//         <div className="space-y-3">
//           {filteredInvoices.map((invoice) => (
//             <div
//               key={invoice.id}
//               className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
//             >
//               <div className="flex-1">
//                 <div className="flex items-center gap-3 mb-2">
//                   <span className="font-bold text-blue-600">
//                     #{invoice.invoiceNumber}
//                   </span>
//                   <span
//                     className={`px-2 py-1 text-xs rounded-full ${
//                       invoice.invoiceType === "GST"
//                         ? "bg-green-100 text-green-800"
//                         : "bg-gray-200 text-gray-800"
//                     }`}
//                   >
//                     {invoice.invoiceType}
//                   </span>
//                 </div>
//                 <p className="text-sm font-medium text-gray-800">
//                   {invoice.customerName}
//                 </p>
//                 <p className="text-xs text-gray-600">{invoice.vehicleNumber}</p>
//               </div>
//               <div className="flex items-center gap-4 mt-3 sm:mt-0">
//                 <div className="text-right">
//                   <p className="text-lg font-bold text-green-600">
//                     ₹{invoice.totalAmount.toFixed(2)}
//                   </p>
//                   <p className="text-xs text-gray-600">{invoice.date}</p>
//                 </div>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => setViewingInvoice(invoice)}
//                     className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
//                   >
//                     <Eye size={18} />
//                   </button>
//                   <button
//                     onClick={() => handleOpenModal(invoice)}
//                     className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
//                   >
//                     <Edit2 size={18} />
//                   </button>
//                   <button
//                     onClick={() => handleDeleteInvoice(invoice)}
//                     className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                   >
//                     <Trash2 size={18} />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           ))}
//           {filteredInvoices.length === 0 && (
//             <div className="text-center py-12 text-gray-500">
//               No invoices found. Create your first invoice!
//             </div>
//           )}
//         </div>

//         {totalInvoices > PAGE_SIZE && (
//           <div className="flex justify-between items-center mt-6 pt-6 border-t">
//             <div className="text-sm text-gray-600">
//               Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
//               {Math.min(currentPage * PAGE_SIZE, totalInvoices)} of{" "}
//               {totalInvoices} invoices
//             </div>
//             <div className="flex gap-2">
//               <button
//                 onClick={() => loadData(currentPage - 1)}
//                 disabled={currentPage === 1 || loading}
//                 className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 Previous
//               </button>
//               <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
//                 Page {currentPage}
//               </span>
//               <button
//                 onClick={() => loadData(currentPage + 1)}
//                 disabled={!hasMore || loading}
//                 className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Invoice Form Modal */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
//           <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
//             <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center rounded-t-lg">
//               <h3 className="text-xl font-bold text-white">
//                 {editingInvoice ? "Edit Invoice" : "Create Invoice"}
//               </h3>
//               <button
//                 onClick={() => setIsModalOpen(false)}
//                 className="text-white hover:opacity-80"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <form
//               onSubmit={handleSubmit}
//               className="p-6 space-y-6 max-h-[80vh] overflow-y-auto"
//             >
//               {/* Invoice Type Toggle */}
//               <div className="flex items-center justify-between">
//                 <label className="text-sm font-medium text-gray-700">
//                   Invoice Type
//                 </label>
//                 <div className="flex bg-gray-100 rounded-lg p-1">
//                   <button
//                     type="button"
//                     onClick={() =>
//                       setFormData({ ...formData, invoiceType: "GST" })
//                     }
//                     className={`px-4 py-2 rounded-md font-medium transition-all ${
//                       formData.invoiceType === "GST"
//                         ? "bg-green-600 text-white shadow-md"
//                         : "text-gray-600"
//                     }`}
//                   >
//                     GST
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() =>
//                       setFormData({ ...formData, invoiceType: "Non-GST" })
//                     }
//                     className={`px-4 py-2 rounded-md font-medium transition-all ${
//                       formData.invoiceType === "Non-GST"
//                         ? "bg-gray-600 text-white shadow-md"
//                         : "text-gray-600"
//                     }`}
//                   >
//                     Non-GST
//                   </button>
//                 </div>
//               </div>

//               {/* Invoice Number and Date */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Invoice Number *
//                   </label>
//                   <input
//                     type="text"
//                     value={formData.invoiceNumber}
//                     onChange={(e) =>
//                       setFormData({
//                         ...formData,
//                         invoiceNumber: e.target.value,
//                       })
//                     }
//                     className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Date *
//                   </label>
//                   <input
//                     type="date"
//                     value={formData.date}
//                     onChange={(e) =>
//                       setFormData({ ...formData, date: e.target.value })
//                     }
//                     className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                     required
//                   />
//                 </div>
//               </div>

//               {/* Customer Selection */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Select Customer *
//                 </label>
//                 <select
//                   value={formData.customerId}
//                   onChange={(e) => handleCustomerChange(e.target.value)}
//                   className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                   required
//                 >
//                   <option value="">Choose a customer</option>
//                   {customers.map((customer) => (
//                     <option key={customer.id} value={customer.id}>
//                       {customer.name} - {customer.phone}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Vehicle Selection */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Select Vehicle *
//                 </label>
//                 <select
//                   value={formData.vehicleId}
//                   onChange={(e) =>
//                     setFormData({ ...formData, vehicleId: e.target.value })
//                   }
//                   className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                   required
//                   disabled={!formData.customerId}
//                 >
//                   <option value="">Choose a vehicle</option>
//                   {vehicles.map((vehicle) => (
//                     <option key={vehicle.id} value={vehicle.id}>
//                       {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Items Section */}
//               <div>
//                 <div className="flex justify-between items-center mb-3">
//                   <label className="text-sm font-medium text-gray-700">
//                     Items
//                   </label>
//                   <div className="flex gap-2">
//                     <button
//                       type="button"
//                       onClick={() => handleOpenItemModal("stock")}
//                       className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
//                     >
//                       + Add Stock
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => handleOpenItemModal("service")}
//                       className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
//                     >
//                       + Add Service
//                     </button>
//                   </div>
//                 </div>

//                 {/* Stocks Table */}
//                 {formData.stocks.length > 0 && (
//                   <div className="mb-4">
//                     <h4 className="text-sm font-semibold text-gray-700 mb-2">
//                       Stocks
//                     </h4>
//                     <div className="border rounded-lg overflow-hidden">
//                       <table className="w-full text-sm">
//                         <thead className="bg-blue-50">
//                           <tr>
//                             <th className="px-3 py-2 text-left">Item</th>
//                             <th className="px-3 py-2 text-right">Qty</th>
//                             <th className="px-3 py-2 text-right">Rate</th>
//                             <th className="px-3 py-2 text-right">GST</th>
//                             <th className="px-3 py-2 text-right">Amount</th>
//                             <th className="px-3 py-2"></th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {formData.stocks.map((item, index) => (
//                             <tr key={index} className="border-t">
//                               <td className="px-3 py-2 font-medium">
//                                 {item.name}
//                               </td>
//                               <td className="px-3 py-2 text-right">
//                                 {item.qty}
//                               </td>
//                               <td className="px-3 py-2 text-right">
//                                 ₹{item.price.toFixed(2)}
//                               </td>
//                               <td className="px-3 py-2 text-right">
//                                 {item.gst}%
//                               </td>
//                               <td className="px-3 py-2 text-right font-medium">
//                                 ₹{item.amount.toFixed(2)}
//                               </td>
//                               <td className="px-3 py-2">
//                                 <button
//                                   type="button"
//                                   onClick={() => handleRemoveStock(index)}
//                                   className="text-red-600 hover:bg-red-50 p-1 rounded"
//                                 >
//                                   <Trash2 size={16} />
//                                 </button>
//                               </td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   </div>
//                 )}

//                 {/* Services Table */}
//                 {formData.services.length > 0 && (
//                   <div className="mb-4">
//                     <h4 className="text-sm font-semibold text-gray-700 mb-2">
//                       Services
//                     </h4>
//                     <div className="border rounded-lg overflow-hidden">
//                       <table className="w-full text-sm">
//                         <thead className="bg-green-50">
//                           <tr>
//                             <th className="px-3 py-2 text-left">Service</th>
//                             <th className="px-3 py-2 text-right">Qty</th>
//                             <th className="px-3 py-2 text-right">Rate</th>
//                             <th className="px-3 py-2 text-right">GST</th>
//                             <th className="px-3 py-2 text-right">Amount</th>
//                             <th className="px-3 py-2"></th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {formData.services.map((item, index) => (
//                             <tr key={index} className="border-t">
//                               <td className="px-3 py-2 font-medium">
//                                 {item.name}
//                               </td>
//                               <td className="px-3 py-2 text-right">
//                                 {item.qty}
//                               </td>
//                               <td className="px-3 py-2 text-right">
//                                 ₹{item.price.toFixed(2)}
//                               </td>
//                               <td className="px-3 py-2 text-right">
//                                 {item.gst}%
//                               </td>
//                               <td className="px-3 py-2 text-right font-medium">
//                                 ₹{item.amount.toFixed(2)}
//                               </td>
//                               <td className="px-3 py-2">
//                                 <button
//                                   type="button"
//                                   onClick={() => handleRemoveService(index)}
//                                   className="text-red-600 hover:bg-red-50 p-1 rounded"
//                                 >
//                                   <Trash2 size={16} />
//                                 </button>
//                               </td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   </div>
//                 )}

//                 {formData.stocks.length === 0 &&
//                   formData.services.length === 0 && (
//                     <p className="text-center py-4 text-gray-500 text-sm border rounded-lg">
//                       No items added yet
//                     </p>
//                   )}
//               </div>

//               {/* Discount */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Discount (%)
//                 </label>
//                 <input
//                   type="number"
//                   value={formData.discount}
//                   onChange={(e) =>
//                     setFormData({
//                       ...formData,
//                       discount: parseFloat(e.target.value) || 0,
//                     })
//                   }
//                   min="0"
//                   max="100"
//                   step="0.01"
//                   className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                 />
//               </div>

//               {/* Additional Charges */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Additional Charges
//                 </label>
//                 <div className="flex gap-2 mb-2">
//                   <input
//                     type="text"
//                     value={chargeDescription}
//                     onChange={(e) => setChargeDescription(e.target.value)}
//                     placeholder="Description"
//                     className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                   />
//                   <input
//                     type="number"
//                     value={chargeAmount}
//                     onChange={(e) => setChargeAmount(e.target.value)}
//                     placeholder="Amount"
//                     step="0.01"
//                     className="w-32 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                   />
//                   <button
//                     type="button"
//                     onClick={handleAddCharge}
//                     className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//                   >
//                     Add
//                   </button>
//                 </div>

//                 {formData.additionalCharges.length > 0 && (
//                   <div className="space-y-2">
//                     {formData.additionalCharges.map((charge, index) => (
//                       <div
//                         key={index}
//                         className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
//                       >
//                         <span className="text-sm">{charge.description}</span>
//                         <div className="flex items-center gap-3">
//                           <span className="text-sm font-medium">
//                             ₹{charge.amount.toFixed(2)}
//                           </span>
//                           <button
//                             type="button"
//                             onClick={() => handleRemoveCharge(index)}
//                             className="text-red-600 hover:bg-red-50 p-1 rounded"
//                           >
//                             <Trash2 size={16} />
//                           </button>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* Note */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Note
//                 </label>
//                 <textarea
//                   value={formData.note}
//                   onChange={(e) =>
//                     setFormData({ ...formData, note: e.target.value })
//                   }
//                   rows={3}
//                   className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                   placeholder="Any additional notes..."
//                 />
//               </div>

//               {/* Totals Summary */}
//               <div className="bg-gray-50 rounded-lg p-4 space-y-2">
//                 <div className="flex justify-between text-sm">
//                   <span className="text-gray-600">Subtotal:</span>
//                   <span className="font-medium">
//                     ₹{totals.subtotal.toFixed(2)}
//                   </span>
//                 </div>
//                 <div className="flex justify-between text-sm">
//                   <span className="text-gray-600">
//                     Discount ({formData.discount}%):
//                   </span>
//                   <span className="font-medium text-red-600">
//                     -₹{totals.discountAmount.toFixed(2)}
//                   </span>
//                 </div>
//                 {formData.invoiceType === "GST" && (
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">GST:</span>
//                     <span className="font-medium">
//                       ₹{totals.gstAmount.toFixed(2)}
//                     </span>
//                   </div>
//                 )}
//                 {formData.additionalCharges.length > 0 && (
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">Additional Charges:</span>
//                     <span className="font-medium">
//                       ₹
//                       {formData.additionalCharges
//                         .reduce((sum, c) => sum + c.amount, 0)
//                         .toFixed(2)}
//                     </span>
//                   </div>
//                 )}
//                 <div className="border-t pt-2 flex justify-between">
//                   <span className="font-bold text-gray-800">Total Amount:</span>
//                   <span className="font-bold text-lg text-green-600">
//                     ₹{totals.totalAmount.toFixed(2)}
//                   </span>
//                 </div>
//               </div>

//               {/* Form Actions */}
//               <div className="flex gap-3 pt-4">
//                 <button
//                   type="button"
//                   onClick={() => setIsModalOpen(false)}
//                   className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
//                 >
//                   {loading
//                     ? "Saving..."
//                     : editingInvoice
//                     ? "Update Invoice"
//                     : "Create Invoice"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Item Selection Modal */}
//       {isItemModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
//             <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
//               <h3 className="text-xl font-bold text-white">
//                 Select {itemModalType === "stock" ? "Stock" : "Service"}
//               </h3>
//               <button
//                 onClick={() => setIsItemModalOpen(false)}
//                 className="text-white hover:opacity-80"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-80px)]">
//               {/* Category Selection */}
//               {!selectedCategory && (
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-3">
//                     Select Category
//                   </label>
//                   <div className="grid grid-cols-2 gap-3">
//                     {(itemModalType === "stock"
//                       ? stockCategories
//                       : serviceCategories
//                     ).map((cat) => (
//                       <button
//                         key={cat.id}
//                         type="button"
//                         onClick={() => handleCategorySelect(cat.name)}
//                         className="p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
//                       >
//                         <p className="font-medium text-gray-800">{cat.name}</p>
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Items List */}
//               {selectedCategory && (
//                 <>
//                   <button
//                     type="button"
//                     onClick={() => {
//                       setSelectedCategory("");
//                       setCategoryItems([]);
//                       setSelectedItem(null);
//                     }}
//                     className="text-blue-600 hover:underline text-sm"
//                   >
//                     ← Back to categories
//                   </button>

//                   <div className="relative">
//                     <Search
//                       className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
//                       size={18}
//                     />
//                     <input
//                       type="text"
//                       value={itemSearch}
//                       onChange={(e) => setItemSearch(e.target.value)}
//                       placeholder={`Search ${
//                         itemModalType === "stock" ? "stocks" : "services"
//                       }...`}
//                       className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                     />
//                   </div>

//                   <div className="space-y-2 max-h-64 overflow-y-auto">
//                     {filteredCategoryItems.map((item) => (
//                       <button
//                         key={item.id}
//                         type="button"
//                         onClick={() => setSelectedItem(item)}
//                         className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
//                           selectedItem?.id === item.id
//                             ? "border-blue-500 bg-blue-50"
//                             : "border-gray-200 hover:border-blue-300"
//                         }`}
//                       >
//                         <p className="font-medium text-gray-800">
//                           {itemModalType === "stock"
//                             ? item.productName
//                             : item.serviceName}
//                         </p>
//                         {itemModalType === "stock" && (
//                           <p className="text-xs text-gray-600">
//                             Part: {item.partNumber}
//                           </p>
//                         )}
//                         <p className="text-sm text-green-600 font-medium mt-1">
//                           ₹
//                           {itemModalType === "stock"
//                             ? item.sellingPrice
//                             : item.labour}{" "}
//                           | GST: {item.gst}%
//                         </p>
//                       </button>
//                     ))}
//                   </div>

//                   {selectedItem && (
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Quantity
//                       </label>
//                       <input
//                         type="number"
//                         value={itemQuantity}
//                         onChange={(e) => setItemQuantity(e.target.value)}
//                         min="0.01"
//                         step="0.01"
//                         className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//                       />
//                     </div>
//                   )}

//                   <button
//                     type="button"
//                     onClick={handleAddItem}
//                     disabled={!selectedItem}
//                     className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     Add Item
//                   </button>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* View Invoice Modal */}
//       {viewingInvoice && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
//             <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
//               <h3 className="text-xl font-bold text-white">Invoice Details</h3>
//               <button
//                 onClick={() => setViewingInvoice(null)}
//                 className="text-white hover:opacity-80"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
//               {/* Header */}
//               <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
//                 <div>
//                   <h4 className="text-sm font-semibold text-gray-600 mb-3">
//                     Invoice Info
//                   </h4>
//                   <p className="text-2xl font-bold text-blue-600 mb-1">
//                     #{viewingInvoice.invoiceNumber}
//                   </p>
//                   <p className="text-sm text-gray-600">{viewingInvoice.date}</p>
//                   <span
//                     className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${
//                       viewingInvoice.invoiceType === "GST"
//                         ? "bg-green-100 text-green-800"
//                         : "bg-gray-200 text-gray-800"
//                     }`}
//                   >
//                     {viewingInvoice.invoiceType}
//                   </span>
//                 </div>
//                 <div className="text-right">
//                   <h4 className="text-sm font-semibold text-gray-600 mb-3">
//                     Total Amount
//                   </h4>
//                   <p className="text-3xl font-bold text-green-600">
//                     ₹{viewingInvoice.totalAmount.toFixed(2)}
//                   </p>
//                 </div>
//               </div>

//               {/* Customer & Vehicle */}
//               <div className="grid grid-cols-2 gap-6 mb-6">
//                 <div>
//                   <h4 className="text-sm font-semibold text-gray-600 mb-2">
//                     Customer
//                   </h4>
//                   <p className="font-medium text-gray-800">
//                     {viewingInvoice.customerName}
//                   </p>
//                   <p className="text-sm text-gray-600">
//                     {viewingInvoice.customerPhone}
//                   </p>
//                   <p className="text-sm text-gray-600">
//                     {viewingInvoice.customerAddress}
//                   </p>
//                   {viewingInvoice.customerGst && (
//                     <p className="text-sm text-gray-600">
//                       GST: {viewingInvoice.customerGst}
//                     </p>
//                   )}
//                 </div>
//                 <div>
//                   <h4 className="text-sm font-semibold text-gray-600 mb-2">
//                     Vehicle
//                   </h4>
//                   <p className="font-medium text-gray-800">
//                     {viewingInvoice.vehicleNumber}
//                   </p>
//                   <p className="text-sm text-gray-600">
//                     {viewingInvoice.vehicleMake} {viewingInvoice.vehicleModel}
//                   </p>
//                   <p className="text-sm text-gray-600">
//                     KM: {viewingInvoice.vehicleKilometer}
//                   </p>
//                 </div>
//               </div>

//               {/* Items */}
//               {viewingInvoice.stocks.length > 0 && (
//                 <div className="mb-6">
//                   <h4 className="text-sm font-semibold text-gray-700 mb-3">
//                     Stocks
//                   </h4>
//                   <div className="border rounded-lg overflow-hidden">
//                     <table className="w-full text-sm">
//                       <thead className="bg-blue-50">
//                         <tr>
//                           <th className="px-4 py-3 text-left">Item</th>
//                           <th className="px-4 py-3 text-right">Qty</th>
//                           <th className="px-4 py-3 text-right">Rate</th>
//                           <th className="px-4 py-3 text-right">GST</th>
//                           <th className="px-4 py-3 text-right">Amount</th>
//                         </tr>
//                       </thead>

//                       <tbody>
//                         {viewingInvoice.stocks.map((item, index) => (
//                           <tr key={index} className="border-t">
//                             <td className="px-4 py-3 font-medium">
//                               {item.name}
//                             </td>
//                             <td className="px-4 py-3 text-right">{item.qty}</td>
//                             <td className="px-4 py-3 text-right">
//                               ₹{item.price.toFixed(2)}
//                             </td>
//                             <td className="px-4 py-3 text-right">
//                               {item.gst}%
//                             </td>
//                             <td className="px-4 py-3 text-right font-medium">
//                               ₹{item.amount.toFixed(2)}
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               )}

//               {viewingInvoice.services.length > 0 && (
//                 <div className="mb-6">
//                   <h4 className="text-sm font-semibold text-gray-700 mb-3">
//                     Services
//                   </h4>
//                   <div className="border rounded-lg overflow-hidden">
//                     <table className="w-full text-sm">
//                       <thead className="bg-green-50">
//                         <tr>
//                           <th className="px-4 py-3 text-left">Service</th>
//                           <th className="px-4 py-3 text-right">Qty</th>
//                           <th className="px-4 py-3 text-right">Rate</th>
//                           <th className="px-4 py-3 text-right">GST</th>
//                           <th className="px-4 py-3 text-right">Amount</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {viewingInvoice.services.map((item, index) => (
//                           <tr key={index} className="border-t">
//                             <td className="px-4 py-3 font-medium">
//                               {item.name}
//                             </td>
//                             <td className="px-4 py-3 text-right">{item.qty}</td>
//                             <td className="px-4 py-3 text-right">
//                               ₹{item.price.toFixed(2)}
//                             </td>
//                             <td className="px-4 py-3 text-right">
//                               {item.gst}%
//                             </td>
//                             <td className="px-4 py-3 text-right font-medium">
//                               ₹{item.amount.toFixed(2)}
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               )}

//               {/* Totals */}
//               <div className="bg-gray-50 rounded-lg p-4 space-y-2">
//                 <div className="flex justify-between text-sm">
//                   <span className="text-gray-600">Subtotal:</span>
//                   <span className="font-medium">
//                     ₹{viewingInvoice.subtotal.toFixed(2)}
//                   </span>
//                 </div>
//                 <div className="flex justify-between text-sm">
//                   <span className="text-gray-600">
//                     Discount ({viewingInvoice.discount}%):
//                   </span>
//                   <span className="font-medium text-red-600">
//                     -₹{viewingInvoice.discountAmount.toFixed(2)}
//                   </span>
//                 </div>
//                 {viewingInvoice.invoiceType === "GST" && (
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">GST:</span>
//                     <span className="font-medium">
//                       ₹{viewingInvoice.gstAmount.toFixed(2)}
//                     </span>
//                   </div>
//                 )}
//                 {viewingInvoice.additionalCharges.length > 0 && (
//                   <>
//                     <div className="border-t pt-2 mt-2">
//                       <p className="text-sm font-semibold text-gray-700 mb-2">
//                         Additional Charges:
//                       </p>
//                       {viewingInvoice.additionalCharges.map((charge, index) => (
//                         <div
//                           key={index}
//                           className="flex justify-between text-sm mb-1"
//                         >
//                           <span className="text-gray-600">
//                             {charge.description}:
//                           </span>
//                           <span className="font-medium">
//                             ₹{charge.amount.toFixed(2)}
//                           </span>
//                         </div>
//                       ))}
//                     </div>
//                   </>
//                 )}
//                 <div className="border-t pt-2 flex justify-between">
//                   <span className="font-bold text-gray-800">Total Amount:</span>
//                   <span className="font-bold text-xl text-green-600">
//                     ₹{viewingInvoice.totalAmount.toFixed(2)}
//                   </span>
//                 </div>
//               </div>

//               {viewingInvoice.note && (
//                 <div className="mt-6">
//                   <h4 className="text-sm font-semibold text-gray-700 mb-2">
//                     Note
//                   </h4>
//                   <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
//                     {viewingInvoice.note}
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
