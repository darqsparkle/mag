import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Trash2, Plus } from 'lucide-react';

export function Settings() {
  const { categories, addCategory, deleteCategory } = useApp();
  const [newStockCategory, setNewStockCategory] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('');

  const handleAddStockCategory = () => {
    if (newStockCategory.trim()) {
      addCategory('stocks', newStockCategory.trim());
      setNewStockCategory('');
    }
  };

  const handleAddServiceCategory = () => {
    if (newServiceCategory.trim()) {
      addCategory('services', newServiceCategory.trim());
      setNewServiceCategory('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Stock Categories</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStockCategory}
                onChange={(e) => setNewStockCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddStockCategory()}
                placeholder="New category name"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                onClick={handleAddStockCategory}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {categories.stocks.map((category) => (
                <div
                  key={category}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-800">{category}</span>
                  <button
                    onClick={() => {
                      if (confirm(`Delete category "${category}"?`)) {
                        deleteCategory('stocks', category);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Service Categories</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newServiceCategory}
                onChange={(e) => setNewServiceCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddServiceCategory()}
                placeholder="New category name"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
              <button
                onClick={handleAddServiceCategory}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={18} />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {categories.services.map((category) => (
                <div
                  key={category}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-800">{category}</span>
                  <button
                    onClick={() => {
                      if (confirm(`Delete category "${category}"?`)) {
                        deleteCategory('services', category);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                defaultValue="My Garage"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default GST Rate</label>
              <select className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                <option value="18">18%</option>
                <option value="12">12%</option>
                <option value="28">28%</option>
              </select>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            Note: Changes to company information are stored locally in this session only.
          </p>
        </div>
      </div>
    </div>
  );
}
