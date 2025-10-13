import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Stock } from '../types';
import { Modal } from '../components/Modal';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

export function Stocks() {
  const { stocks, categories, addStock, updateStock, deleteStock, addCategory } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    productName: '',
    partNumber: '',
    hsnCode: '',
    purchasePrice: '',
    profitMargin: '20',
    sellingPrice: '',
    gst: '18',
    category: '',
  });
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

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
        productName: '',
        partNumber: '',
        hsnCode: '',
        purchasePrice: '',
        profitMargin: '20',
        sellingPrice: '',
        gst: '18',
        category: '',
      });
    }
    setIsModalOpen(true);
  };

  const calculateSellingPrice = (purchase: number, margin: number) => {
    return purchase + (purchase * margin) / 100;
  };

  const handlePurchasePriceChange = (value: string) => {
    setFormData((prev) => {
      const purchase = parseFloat(value) || 0;
      const margin = parseFloat(prev.profitMargin) || 0;
      return {
        ...prev,
        purchasePrice: value,
        sellingPrice: calculateSellingPrice(purchase, margin).toFixed(2),
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
        sellingPrice: calculateSellingPrice(purchase, margin).toFixed(2),
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productName || !formData.partNumber || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    const stockData: Stock = {
      id: editingStock?.id || Date.now().toString(),
      productName: formData.productName,
      partNumber: formData.partNumber,
      hsnCode: formData.hsnCode,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      profitMargin: parseFloat(formData.profitMargin) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      gst: parseFloat(formData.gst) || 0,
      category: formData.category,
    };

    if (editingStock) {
      updateStock(stockData);
    } else {
      addStock(stockData);
    }

    setIsModalOpen(false);
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addCategory('stocks', newCategory.trim());
      setFormData({ ...formData, category: newCategory.trim() });
      setNewCategory('');
      setShowNewCategory(false);
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Manage Stocks</h2>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            Add New Stock
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, category, or part number..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Part Number</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Purchase</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Selling</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">GST</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((stock) => (
                <tr key={stock.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">{stock.productName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{stock.partNumber}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {stock.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">₹{stock.purchasePrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">
                    ₹{stock.sellingPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{stock.gst}%</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(stock)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this stock?')) {
                            deleteStock(stock.id);
                          }
                        }}
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
              No stocks found. Add your first stock to get started!
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStock ? 'Edit Stock' : 'Add New Stock'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Part Number *</label>
              <input
                type="text"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HSN Code</label>
              <input
                type="text"
                value={formData.hsnCode}
                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Profit Margin</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GST Percentage</label>
              <select
                value={formData.gst}
                onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              {!showNewCategory ? (
                <select
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setShowNewCategory(true);
                    } else {
                      setFormData({ ...formData, category: e.target.value });
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.stocks.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__new__">+ Create New Category</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategory(false);
                      setNewCategory('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              {editingStock ? 'Update Stock' : 'Add Stock'}
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
      </Modal>
    </div>
  );
}
