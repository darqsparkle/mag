import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, X, Folder } from "lucide-react";
import {
  addStock,
  updateStock,
  deleteStock,
  getCategories,
  createCategory,
  getAllStocks,
  searchStocks,
  Stock,
  Category,
  clearStocksCache,
  getStocksPaginated,
  cleanupOldStockStructure,
  migrateStocksToFlatStructure,
  getStocksPaginatedFlat,
  updateStockFlat,
  addStockFlat,
  deleteStockFlat,
  deleteCategory,
  updateCategory,
  getStocksByCategoryFlat,
} from "../services/stockServices";
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

export function Stocks() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStocks, setTotalStocks] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20;

  const [showCategories, setShowCategories] = useState(false);
const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    show: boolean;
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [useNewStructure, setUseNewStructure] = useState(() => {
  const stored = localStorage.getItem("useStockNewStructure");
  // Default to TRUE if not set
  return stored !== null ? stored === "true" : true;
});

  const toggleStructure = (value: boolean) => {
    setUseNewStructure(value);
    localStorage.setItem("useStockNewStructure", value.toString());
  };
const handleEditCategory = (category: Category) => {
  setEditingCategory(category);
  setNewCategoryName(category.name);
  setIsCategoryModalOpen(true);
};

const handleUpdateCategory = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newCategoryName.trim() || !editingCategory) {
    alert("Please enter category name");
    return;
  }

  try {
    setLoading(true);
    await updateCategory(editingCategory.id!, newCategoryName.trim());
    
    setNewCategoryName("");
    setEditingCategory(null);
    setIsCategoryModalOpen(false);
    await loadData();
  } catch (error) {
    console.error("Error updating category:", error);
    alert("Error updating category");
  } finally {
    setLoading(false);
  }
};

const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
  // Check if category has stocks
  const stocksInCategory = await getStocksByCategoryFlat(categoryName);
  
  if (stocksInCategory.length > 0) {
    alert(`Cannot delete "${categoryName}" - it has ${stocksInCategory.length} stock(s). Please delete or move the stocks first.`);
    return;
  }

  if (!confirm(`Are you sure you want to delete category "${categoryName}"?`)) {
    return;
  }

  try {
    setLoading(true);
    await deleteCategory(categoryId);
    await loadData();
  } catch (error) {
    console.error("Error deleting category:", error);
    alert("Error deleting category");
  } finally {
    setLoading(false);
  }
};
  const handleMigration = async () => {
    if (
      !confirm(
        "⚠️ This will migrate all stocks to the new structure. Continue?"
      )
    ) {
      return;
    }

    try {
      setIsMigrating(true);
      const results = await migrateStocksToFlatStructure();

      setMigrationStatus({
        show: true,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      });

      if (results.failed === 0) {
        alert(`✅ Migration successful! ${results.success} stocks migrated.`);
        toggleStructure(true);
        clearStocksCache();
        sessionCache.clear();
        await loadData(1);
      } else {
        alert(
          `⚠️ Migration completed with errors.\nSuccess: ${results.success}\nFailed: ${results.failed}`
        );
      }
    } catch (error) {
      console.error("Migration error:", error);
      alert("❌ Migration failed. Check console for details.");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleCleanupOld = async () => {
    if (
      !confirm(
        "⚠️⚠️ DANGER: This will DELETE all old structure data. Only proceed if migration was verified successful!"
      )
    ) {
      return;
    }

    if (!confirm("Are you ABSOLUTELY sure? This cannot be undone!")) {
      return;
    }

    try {
      setLoading(true);
      await cleanupOldStockStructure();
      alert("✅ Old structure cleaned up successfully!");
    } catch (error) {
      console.error("Cleanup error:", error);
      alert("❌ Cleanup failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    productName: "",
    partNumber: "",
    hsnCode: "",
    purchasePrice: "",
    profitMargin: "20",
    sellingPrice: "",
    gst: "18",
    category: "",
  });

  // Load categories and stocks on component mount
  useEffect(() => {
    // Try to load from memory first
    const cachedData = sessionCache.get("stocksData");
    const cachedPage = sessionCache.get("currentPage");

    if (cachedData && cachedPage) {
      setStocks(cachedData.stocks);
      setCategories(cachedData.categories);
      setCurrentPage(parseInt(cachedPage));
      setTotalStocks(cachedData.totalStocks);
      setHasMore(cachedData.hasMore);
    } else {
      loadData();
    }
  }, []);

  const loadData = async (page: number = 1) => {
    try {
      setLoading(true);
      const [loadedCategories, paginatedData] = await Promise.all([
        getCategories(),
        
          getStocksPaginatedFlat(page, PAGE_SIZE)
         
      ]);

      setCategories(loadedCategories);
      setStocks(paginatedData.stocks);
      setTotalStocks(paginatedData.totalCount);
      setHasMore(paginatedData.hasMore);
      setCurrentPage(page);

      sessionCache.set("stocksData", {
        stocks: paginatedData.stocks,
        categories: loadedCategories,
        totalStocks: paginatedData.totalCount,
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

  const calculateSellingPrice = (purchase: number, margin: number): string => {
    return (purchase + (purchase * margin) / 100).toFixed(2);
  };

  const handlePurchasePriceChange = (value: string) => {
    setFormData((prev) => {
      const purchase = parseFloat(value) || 0;
      const margin = parseFloat(prev.profitMargin) || 0;
      return {
        ...prev,
        purchasePrice: value,
        sellingPrice: calculateSellingPrice(purchase, margin),
      };
    });
  };

  const handleProfitMarginChange = (value: string) => {
    setFormData((prev) => {
      const purchase = parseFloat(prev.purchasePrice) || 0;
      const margin = parseFloat(value) || 0;
      return {
        ...prev,
        profitMargin: value,
        sellingPrice: calculateSellingPrice(purchase, margin),
      };
    });
  };

  const handleOpenModal = (stock?: Stock) => {
    if (stock) {
      setEditingStock(stock);
      setFormData({
        productName: stock.productName,
        partNumber: stock.partNumber,
        hsnCode: stock.hsnCode,
        purchasePrice: stock.purchasePrice.toString(),
        profitMargin: stock.profitMargin.toString(),
        sellingPrice: stock.sellingPrice.toString(),
        gst: stock.gst.toString(),
        category: stock.category,
      });
    } else {
      setEditingStock(null);
      setFormData({
        productName: "",
        partNumber: "",
        hsnCode: "",
        purchasePrice: "",
        profitMargin: "20",
        sellingPrice: "",
        gst: "18",
        category: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productName || !formData.partNumber || !formData.category) {
      alert("Please fill in all required fields");
      return;
    }

    if (!formData.purchasePrice) {
      alert("Please enter purchase price");
      return;
    }

    try {
      setLoading(true);

      const stockData: Stock = {
        id: editingStock?.id,
        productName: formData.productName.trim(),
        partNumber: formData.partNumber.trim(),
        hsnCode: formData.hsnCode?.trim() || "",
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        profitMargin: parseFloat(formData.profitMargin) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        gst: parseFloat(formData.gst) || 0,
        category: formData.category.trim(),
      };

      if (editingStock) {
  await updateStockFlat(stockData);  // Remove conditional
} else {
  await addStockFlat(stockData);     // Remove conditional
}

      setIsModalOpen(false);
      sessionCache.clear();
      clearStocksCache();
      await loadData(currentPage);
    } catch (error) {
      console.error("Error saving stock:", error);
      alert("Error saving stock");
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
      await createCategory(newCategoryName.trim());
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

  const handleDeleteStock = async (stock: Stock) => {
    if (!confirm(`Are you sure you want to delete "${stock.productName}"?`)) {
      return;
    }

     try {
    setLoading(true);
    await deleteStockFlat(stock.id!);  // Remove conditional
    sessionCache.clear();
    clearStocksCache();
    await loadData(currentPage);
  } catch (error) {
    console.error("Error deleting stock:", error);
    alert("Error deleting stock");
  } finally {
    setLoading(false);
  }
};

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Manage Stocks</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
            >
              <Folder size={20} />
              New Category
            </button>
            <button
  onClick={() => setShowCategories(!showCategories)}
  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg"
>
  <Folder size={20} />
  {showCategories ? 'Hide Categories' : 'View Categories'}
</button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              Add Stock
            </button>

            {/* <button
              onClick={handleMigration}
              disabled={isMigrating || useNewStructure}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMigrating ? "Migrating..." : "🔄 Migrate Stocks"}
            </button>

            {useNewStructure && (
              <button
                onClick={handleCleanupOld}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg text-sm"
              >
                🗑️ Cleanup Old Stock Data
              </button>
            )} */}
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
            placeholder="Search by name, category, or part number..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
{showCategories && (
  <div className="mb-6 bg-gray-50 rounded-lg p-4">
    <h3 className="text-lg font-semibold text-gray-800 mb-3">Stock Categories</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {categories.map((category) => (
        <div key={category.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
          <span className="font-medium text-gray-700">{category.name}</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleEditCategory(category)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => handleDeleteCategory(category.id!, category.name)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
        {/* Stocks Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Product Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Part Number
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Purchase
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Margin
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Selling
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  GST
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  HSN
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((stock) => (
                <tr
                  key={stock.id}
                  className="border-t border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {stock.productName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {stock.partNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {stock.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    ₹{stock.purchasePrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {stock.profitMargin}%
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">
                    ₹{stock.sellingPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {stock.gst}%
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {stock.hsnCode || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(stock)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteStock(stock)}
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
          {filteredStocks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {stocks.length === 0
                ? "No stocks found. Add your first stock to get started!"
                : "No matching stocks found."}
            </div>
          )}
        </div>
        {/* Pagination Controls */}
        {totalStocks > PAGE_SIZE && (
          <div className="flex justify-between items-center mt-6 pt-6 border-t">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(currentPage * PAGE_SIZE, totalStocks)} of {totalStocks}{" "}
              stocks
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadData(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
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

      {/* Stock Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingStock ? "Edit Stock" : "Add New Stock"}
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
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) =>
                      setFormData({ ...formData, productName: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Part Number *
                  </label>
                  <input
                    type="text"
                    value={formData.partNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, partNumber: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                    Purchase Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => handlePurchasePriceChange(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profit Margin
                  </label>
                  <select
                    value={formData.profitMargin}
                    onChange={(e) => handleProfitMarginChange(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="10">10%</option>
                    <option value="20">20%</option>
                    <option value="25">25%</option>
                    <option value="30">30%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selling Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingPrice: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : editingStock
                    ? "Update Stock"
                    : "Add Stock"}
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
                  placeholder="e.g., Engine, Transmission, Suspension"
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      )}
    </div>
  );
}

