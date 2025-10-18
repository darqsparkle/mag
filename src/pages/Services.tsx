import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, X, Folder } from "lucide-react";
import {
  addService,
  updateService,
  deleteService,
  getServiceCategories,
  createServiceCategory,
  clearServicesCache,
  getServicesPaginated,
  Service,
  ServiceCategory,
  cleanupOldStructure,
  migrateServicesToFlatStructure,
  getServicesPaginatedFlat,
  updateServiceFlat,
  addServiceFlat,
  deleteServiceFlat,
  testNewStructure,
} from "../services/servicesServices";

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

export function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalServices, setTotalServices] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20;

  // Add to Services.tsx component

const [isMigrating, setIsMigrating] = useState(false);
const [migrationStatus, setMigrationStatus] = useState<{
  show: boolean;
  success: number;
  failed: number;
  errors: string[];
} | null>(null);
const [useNewStructure, setUseNewStructure] = useState(() => {
  // Check localStorage for structure preference
  const stored = localStorage.getItem('useNewStructure');
  return stored === 'true';
});

const toggleStructure = (value: boolean) => {
  setUseNewStructure(value);
  localStorage.setItem('useNewStructure', value.toString());
};

  const [formData, setFormData] = useState({
    serviceName: "",
    hsnCode: "",
    gst: "18",
    labour: "",
    category: "",
  });

  // Load categories and services on component mount
  useEffect(() => {
    // Try to load from memory first
    const cachedData = sessionCache.get("servicesData");
    const cachedPage = sessionCache.get("currentPage");

    if (cachedData && cachedPage) {
      setServices(cachedData.services);
      setCategories(cachedData.categories);
      setCurrentPage(parseInt(cachedPage));
      setTotalServices(cachedData.totalServices);
      setHasMore(cachedData.hasMore);
    } else {
      loadData();
    }
  }, []);
  // Add to useEffect in Services.tsx

// useEffect(() => {
//   const testStructure = async () => {
//     const isNew = localStorage.getItem('useNewStructure') === 'true';
//     console.log('Using structure:', isNew ? 'NEW' : 'OLD');
    
//     if (isNew) {
//       const test = await testNewStructure();
//       console.log('Structure test:', test);
//     }
//   };
  
//   testStructure();
  
//   // ... rest of existing useEffect code
// }, []);

  const loadData = async (page: number = 1) => {
  try {
    setLoading(true);
    const [loadedCategories, paginatedData] = await Promise.all([
      getServiceCategories(),
      useNewStructure 
        ? getServicesPaginatedFlat(page, PAGE_SIZE)
        : getServicesPaginated(page, PAGE_SIZE)
    ]);

    setCategories(loadedCategories);
    setServices(paginatedData.services);
    setTotalServices(paginatedData.totalCount);
    setHasMore(paginatedData.hasMore);
    setCurrentPage(page);

    sessionCache.set("servicesData", {
      services: paginatedData.services,
      categories: loadedCategories,
      totalServices: paginatedData.totalCount,
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
  // Add to Services.tsx component

const handleMigration = async () => {
  if (!confirm("⚠️ This will migrate all services to the new structure. Continue?")) {
    return;
  }
  
  try {
    setIsMigrating(true);
    const results = await migrateServicesToFlatStructure();
    
    setMigrationStatus({
      show: true,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
    });
    
    if (results.failed === 0) {
      alert(`✅ Migration successful! ${results.success} services migrated.`);
      toggleStructure(true); // Use the new function
      clearServicesCache();
      sessionCache.clear();
      await loadData(1);
    } else {
      alert(`⚠️ Migration completed with errors.\nSuccess: ${results.success}\nFailed: ${results.failed}`);
    }
  } catch (error) {
    console.error("Migration error:", error);
    alert("❌ Migration failed. Check console for details.");
  } finally {
    setIsMigrating(false);
  }
};

const handleCleanupOld = async () => {
  if (!confirm("⚠️⚠️ DANGER: This will DELETE all old structure data. Only proceed if migration was verified successful!")) {
    return;
  }
  
  if (!confirm("Are you ABSOLUTELY sure? This cannot be undone!")) {
    return;
  }
  
  try {
    setLoading(true);
    await cleanupOldStructure();
    alert("✅ Old structure cleaned up successfully!");
  } catch (error) {
    console.error("Cleanup error:", error);
    alert("❌ Cleanup failed. Check console.");
  } finally {
    setLoading(false);
  }
};

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        serviceName: service.serviceName,
        hsnCode: service.hsnCode,
        gst: service.gst.toString(),
        labour: service.labour.toString(),
        category: service.category,
      });
    } else {
      setEditingService(null);
      setFormData({
        serviceName: "",
        hsnCode: "",
        gst: "18",
        labour: "",
        category: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // --- Validation ---
  if (!formData.serviceName || !formData.category) {
    alert("Please fill in all required fields (Service Name, Category)");
    return;
  }

  if (!formData.labour) {
    alert("Please enter labour charge");
    return;
  }

  try {
    setLoading(true);

    // --- Prepare data ---
    const serviceData: Service = {
      id: editingService?.id,
      serviceName: formData.serviceName.trim(),
      hsnCode: formData.hsnCode?.trim() || "",
      gst: parseFloat(formData.gst) || 0,
      labour: parseFloat(formData.labour) || 0,
      category: formData.category.trim(),
    };

    // --- Add or Update Service (supports both structures) ---
    if (editingService) {
      await (useNewStructure ? updateServiceFlat : updateService)(serviceData);
    } else {
      await (useNewStructure ? addServiceFlat : addService)(serviceData);
    }

    // --- Post actions ---
    setIsModalOpen(false);
    sessionCache.clear();
    clearServicesCache();
    await loadData(currentPage);
  } catch (error) {
    console.error("Error saving service:", error);
    alert("Error saving service");
  } finally {
    setLoading(false);
  }
};


  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) {
      alert("Please enter category name");
      return;
    }

    try {
      setLoading(true);
      await createServiceCategory(newCategoryName.trim());
      setNewCategoryName("");
      setIsCategoryModalOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Error adding category");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (service: Service) => {
  // --- Confirmation ---
  const confirmDelete = confirm(`Are you sure you want to delete "${service.serviceName}"?`);
  if (!confirmDelete) return;

  try {
    setLoading(true);

    // --- Delete logic (supports both structures) ---
    if (useNewStructure) {
      await deleteServiceFlat(service.id!);
    } else {
      await deleteService(service);
    }

    // --- Post actions ---
    sessionCache.clear(); // Clear UI/session cache
    clearServicesCache(); // Clear local service cache
    await loadData(currentPage); // Reload data
  } catch (error) {
    console.error("Error deleting service:", error);
    alert("Error deleting service");
  } finally {
    setLoading(false);
  }
};


  const filteredServices = searchTerm 
  ? services.filter(
      (service) =>
        service.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.hsnCode.toLowerCase().includes(searchTerm.toLowerCase())
    )
  : services;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Manage Services</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
            >
              <Folder size={20} />
              New Category
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              Add Service
            </button>
            {/* Add this in the header next to other buttons */}
{/* <button
  onClick={handleMigration}
  disabled={isMigrating || useNewStructure}
  className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isMigrating ? "Migrating..." : "🔄 Migrate to New Structure"}
</button>

{useNewStructure && (
  <button
    onClick={handleCleanupOld}
    className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg text-sm"
  >
    🗑️ Cleanup Old Data
  </button>
)} */}

{/* <button
  onClick={() => {
    const current = localStorage.getItem('useNewStructure') === 'true';
    console.log('Current structure:', current ? 'NEW' : 'OLD');
    console.log('Services count:', services.length);
    toggleStructure(!current);
    window.location.reload();
  }}
  className="px-4 py-2 bg-blue-500 text-white rounded"
>
  Toggle Structure (Current: {useNewStructure ? 'NEW' : 'OLD'})
</button> */}
          </div>
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
            placeholder="Search by service name, category, or HSN code..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Services Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Service Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  HSN Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Labour
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  GST
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service) => (
                <tr
                  key={service.id}
                  className="border-t border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {service.serviceName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {service.hsnCode || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {service.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">
                    ₹{service.labour.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {service.gst}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(service)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service)}
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
          {filteredServices.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {services.length === 0
                ? "No services found. Add your first service to get started!"
                : "No matching services found."}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalServices > PAGE_SIZE && (
          <div className="flex justify-between items-center mt-6 pt-6 border-t">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(currentPage * PAGE_SIZE, totalServices)} of {totalServices}{" "}
              services
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadData(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
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

      {/* Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingService ? "Edit Service" : "Add New Service"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:opacity-80"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    value={formData.serviceName}
                    onChange={(e) =>
                      setFormData({ ...formData, serviceName: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) =>
                      setFormData({ ...formData, hsnCode: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Labour Charge *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.labour}
                    onChange={(e) =>
                      setFormData({ ...formData, labour: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Percentage
                  </label>
                  <select
                    value={formData.gst}
                    onChange={(e) =>
                      setFormData({ ...formData, gst: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : editingService
                    ? "Update Service"
                    : "Add Service"}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                Create New Category
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-white hover:opacity-80"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Oil Change, Brake Service, Tire Rotation"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleAddCategory}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Category"}
                </button>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </div>
      )}
    </div>
  );
}
