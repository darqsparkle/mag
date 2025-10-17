import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, X, Car } from "lucide-react";
import {
  addCustomer,
  updateCustomer,
  deleteCustomer,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  clearCustomersCache,
  getCustomersPaginated,
  Customer,
  Vehicle,
  CustomerWithVehicles,
} from "../services/CustomerService";

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

export function Customers() {
  const [customers, setCustomers] = useState<CustomerWithVehicles[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithVehicles | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20;

  const [customerFormData, setCustomerFormData] = useState({
    name: "",
    phone: "",
    address: "",
    gstNumber: "",
  });

  const [vehicleFormData, setVehicleFormData] = useState({
    vehicleNumber: "",
    make: "",
    model: "",
    kilometer: "",
  });

  // Load customers on component mount
  useEffect(() => {
    const cachedData = sessionCache.get("customersData");
    const cachedPage = sessionCache.get("currentPage");

    if (cachedData && cachedPage) {
      setCustomers(cachedData.customers);
      setCurrentPage(parseInt(cachedPage));
      setTotalCustomers(cachedData.totalCustomers);
      setHasMore(cachedData.hasMore);
    } else {
      loadData();
    }
  }, []);

  const loadData = async (page: number = 1) => {
    try {
      setLoading(true);
      const paginatedData = await getCustomersPaginated(page, PAGE_SIZE);

      setCustomers(paginatedData.customers);
      setTotalCustomers(paginatedData.totalCount);
      setHasMore(paginatedData.hasMore);
      setCurrentPage(page);

      // Cache the data
      sessionCache.set("customersData", {
        customers: paginatedData.customers,
        totalCustomers: paginatedData.totalCount,
        hasMore: paginatedData.hasMore,
      });
      sessionCache.set("currentPage", page.toString());
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  // Customer Modal Handlers
  const handleOpenCustomerModal = (customer?: CustomerWithVehicles) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerFormData({
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        gstNumber: customer.gstNumber || "",
      });
    } else {
      setEditingCustomer(null);
      setCustomerFormData({
        name: "",
        phone: "",
        address: "",
        gstNumber: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerFormData.name || !customerFormData.phone) {
      alert("Please fill in all required fields (Name, Phone)");
      return;
    }

    try {
      setLoading(true);

      const customerData: Customer = {
        id: editingCustomer?.id,
        name: customerFormData.name,
        phone: customerFormData.phone,
        address: customerFormData.address,
        gstNumber: customerFormData.gstNumber,
      };

      if (editingCustomer) {
        await updateCustomer(customerData);
      } else {
        await addCustomer(customerData);
      }

      setIsModalOpen(false);
      sessionCache.clear();
      clearCustomersCache();
      await loadData(currentPage);
    } catch (error) {
      console.error("Error saving customer:", error);
      alert("Error saving customer");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customer: CustomerWithVehicles) => {
    const vehicleCount = customer.vehicles.length;
    const confirmMessage = vehicleCount > 0
      ? `Are you sure you want to delete "${customer.name}"? This will also delete ${vehicleCount} associated vehicle(s).`
      : `Are you sure you want to delete "${customer.name}"?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      await deleteCustomer(customer.id!);
      sessionCache.clear();
      clearCustomersCache();
      await loadData(currentPage);
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Error deleting customer");
    } finally {
      setLoading(false);
    }
  };

  // Vehicle Modal Handlers
  const handleOpenVehicleModal = (customerId: string, vehicle?: Vehicle) => {
    setSelectedCustomerId(customerId);
    
    if (vehicle) {
      setEditingVehicle(vehicle);
      setVehicleFormData({
        vehicleNumber: vehicle.vehicleNumber,
        make: vehicle.make,
        model: vehicle.model,
        kilometer: vehicle.kilometer,
      });
    } else {
      setEditingVehicle(null);
      setVehicleFormData({
        vehicleNumber: "",
        make: "",
        model: "",
        kilometer: "",
      });
    }
    setIsVehicleModalOpen(true);
  };

  const handleSubmitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleFormData.vehicleNumber || !vehicleFormData.make || !vehicleFormData.model) {
      alert("Please fill in all required fields (Vehicle Number, Make, Model)");
      return;
    }

    try {
      setLoading(true);

      const vehicleData: Vehicle = {
        id: editingVehicle?.id,
        customerId: selectedCustomerId,
        vehicleNumber: vehicleFormData.vehicleNumber,
        make: vehicleFormData.make,
        model: vehicleFormData.model,
        kilometer: vehicleFormData.kilometer,
      };

      if (editingVehicle) {
        await updateVehicle(vehicleData);
      } else {
        await addVehicle(vehicleData);
      }

      setIsVehicleModalOpen(false);
      sessionCache.clear();
      clearCustomersCache();
      await loadData(currentPage);
    } catch (error) {
      console.error("Error saving vehicle:", error);
      alert("Error saving vehicle");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!confirm(`Are you sure you want to delete vehicle "${vehicle.vehicleNumber}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteVehicle(vehicle.id!);
      sessionCache.clear();
      clearCustomersCache();
      await loadData(currentPage);
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      alert("Error deleting vehicle");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.vehicles.some(
        (vehicle) =>
          vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Customer & Vehicle Management</h2>
          <button
            onClick={() => handleOpenCustomerModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            Add Customer
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, address, or vehicle details..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Customers Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Customer Details
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  GST Number
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Vehicles
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-t border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {customer.name}
                      </p>
                      <p className="text-xs text-gray-500">{customer.address}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {customer.phone}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {customer.gstNumber || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      {customer.vehicles.map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className="flex items-center justify-between bg-orange-50 p-2 rounded-lg"
                        >
                          <div className="flex-1">
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                              {vehicle.vehicleNumber}
                            </span>
                            <span className="ml-2 text-xs text-gray-600">
                              {vehicle.make} {vehicle.model} - {vehicle.kilometer} km
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleOpenVehicleModal(customer.id!, vehicle)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteVehicle(vehicle)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => handleOpenVehicleModal(customer.id!)}
                        className="flex items-center gap-1 text-orange-600 hover:text-orange-700 text-sm font-medium"
                      >
                        <Car size={14} />
                        Add Vehicle
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenCustomerModal(customer)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {customers.length === 0
                ? "No customers found. Add your first customer to get started!"
                : "No matching customers found."}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalCustomers > PAGE_SIZE && (
          <div className="flex justify-between items-center mt-6 pt-6 border-t">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(currentPage * PAGE_SIZE, totalCustomers)} of {totalCustomers}{" "}
              customers
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadData(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium">
                Page {currentPage}
              </span>
              <button
                onClick={() => loadData(currentPage + 1)}
                disabled={!hasMore || loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:opacity-80"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={customerFormData.name}
                    onChange={(e) =>
                      setCustomerFormData({ ...customerFormData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={customerFormData.phone}
                    onChange={(e) =>
                      setCustomerFormData({ ...customerFormData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={customerFormData.gstNumber}
                    onChange={(e) =>
                      setCustomerFormData({ ...customerFormData, gstNumber: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={customerFormData.address}
                    onChange={(e) =>
                      setCustomerFormData({ ...customerFormData, address: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-orange-800 transition-all disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : editingCustomer
                    ? "Update Customer"
                    : "Add Customer"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
              </h3>
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="text-white hover:opacity-80"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    value={vehicleFormData.vehicleNumber}
                    onChange={(e) =>
                      setVehicleFormData({
                        ...vehicleFormData,
                        vehicleNumber: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Make *
                  </label>
                  <input
                    type="text"
                    value={vehicleFormData.make}
                    onChange={(e) =>
                      setVehicleFormData({ ...vehicleFormData, make: e.target.value })
                    }
                    placeholder="e.g., Maruti, Honda, Hyundai"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={vehicleFormData.model}
                    onChange={(e) =>
                      setVehicleFormData({ ...vehicleFormData, model: e.target.value })
                    }
                    placeholder="e.g., Swift, City, i20"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilometer
                  </label>
                  <input
                    type="text"
                    value={vehicleFormData.kilometer}
                    onChange={(e) =>
                      setVehicleFormData({ ...vehicleFormData, kilometer: e.target.value })
                    }
                    placeholder="e.g., 56000"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : editingVehicle
                    ? "Update Vehicle"
                    : "Add Vehicle"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        </div>
      )}
    </div>
  );
}
