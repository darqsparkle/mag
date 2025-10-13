import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Invoice, InvoiceItem } from '../types';
import { Modal } from '../components/Modal';
import { Plus, Search, Trash2, Eye, Printer } from 'lucide-react';

export function Invoices() {
  const { invoices, customers, stocks, services, addInvoice, updateInvoice, deleteInvoice } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalType, setItemModalType] = useState<'stock' | 'service'>('stock');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    customerId: '',
    isGST: true,
    items: [] as InvoiceItem[],
    discount: '0',
    additionalCharges: [] as { description: string; amount: number }[],
    note: '',
  });

  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState('1');

  const handleOpenModal = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customerId: invoice.customer.id,
        isGST: invoice.isGST,
        items: invoice.items,
        discount: invoice.discount.toString(),
        additionalCharges: invoice.additionalCharges,
        note: invoice.note,
      });
    } else {
      setEditingInvoice(null);
      const nextInvoiceNum = `INV${Date.now().toString().slice(-6)}`;
      setFormData({
        invoiceNumber: nextInvoiceNum,
        invoiceDate: new Date().toISOString().split('T')[0],
        customerId: '',
        isGST: true,
        items: [],
        discount: '0',
        additionalCharges: [],
        note: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    if (!selectedItem) return;

    if (itemModalType === 'stock') {
      const stock = stocks.find((s) => s.id === selectedItem);
      if (stock) {
        const quantity = parseFloat(itemQuantity) || 1;
        const amount = stock.sellingPrice * quantity;
        const newItem: InvoiceItem = {
          id: Date.now().toString(),
          type: 'stock',
          name: stock.productName,
          hsnCode: stock.hsnCode,
          quantity,
          rate: stock.sellingPrice,
          gst: stock.gst,
          amount,
        };
        setFormData({ ...formData, items: [...formData.items, newItem] });
      }
    } else {
      const service = services.find((s) => s.id === selectedItem);
      if (service) {
        const quantity = parseFloat(itemQuantity) || 1;
        const amount = service.labour * quantity;
        const newItem: InvoiceItem = {
          id: Date.now().toString(),
          type: 'service',
          name: service.serviceName,
          hsnCode: service.hsnCode,
          quantity,
          rate: service.labour,
          gst: service.gst,
          amount,
        };
        setFormData({ ...formData, items: [...formData.items, newItem] });
      }
    }

    setIsItemModalOpen(false);
    setSelectedItem('');
    setItemQuantity('1');
    setItemSearch('');
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = (subtotal * parseFloat(formData.discount)) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const additionalTotal = formData.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);

    let gstAmount = 0;
    if (formData.isGST) {
      gstAmount = formData.items.reduce((sum, item) => {
        return sum + (item.amount * item.gst) / 100;
      }, 0);
    }

    const grandTotal = subtotalAfterDiscount + gstAmount + additionalTotal;

    return { subtotal, discountAmount, gstAmount, grandTotal };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId || formData.items.length === 0) {
      alert('Please select a customer and add at least one item');
      return;
    }

    const customer = customers.find((c) => c.id === formData.customerId)!;
    const totals = calculateTotals();

    const invoiceData: Invoice = {
      id: editingInvoice?.id || Date.now().toString(),
      invoiceNumber: formData.invoiceNumber,
      invoiceDate: formData.invoiceDate,
      customer,
      isGST: formData.isGST,
      items: formData.items,
      discount: parseFloat(formData.discount),
      additionalCharges: formData.additionalCharges,
      note: formData.note,
      subtotal: totals.subtotal,
      gstAmount: totals.gstAmount,
      grandTotal: totals.grandTotal,
    };

    if (editingInvoice) {
      updateInvoice(invoiceData);
    } else {
      addInvoice(invoiceData);
    }

    setIsModalOpen(false);
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMonth = selectedMonth
      ? invoice.invoiceDate.startsWith(selectedMonth)
      : true;

    return matchesSearch && matchesMonth;
  });

  const filteredItems = itemModalType === 'stock'
    ? stocks.filter((s) => s.productName.toLowerCase().includes(itemSearch.toLowerCase()))
    : services.filter((s) => s.serviceName.toLowerCase().includes(itemSearch.toLowerCase()));

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice number or customer..."
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
                  <span className="font-bold text-blue-600">#{invoice.invoiceNumber}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${invoice.isGST ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                    {invoice.isGST ? 'GST' : 'Non-GST'}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800">{invoice.customer.name}</p>
                <p className="text-xs text-gray-600">{invoice.customer.vehicleNumber}</p>
              </div>
              <div className="flex items-center gap-4 mt-3 sm:mt-0">
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">₹{invoice.grandTotal.toFixed(2)}</p>
                  <p className="text-xs text-gray-600">{invoice.invoiceDate}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingInvoice(invoice)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this invoice?')) {
                        deleteInvoice(invoice.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Invoice">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Invoice Type</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isGST: true })}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  formData.isGST ? 'bg-green-600 text-white shadow-md' : 'text-gray-600'
                }`}
              >
                GST
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isGST: false })}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  !formData.isGST ? 'bg-gray-600 text-white shadow-md' : 'text-gray-600'
                }`}
              >
                Non-GST
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date</label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer *</label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.vehicleNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-gray-700">Items</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setItemModalType('stock');
                    setIsItemModalOpen(true);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemModalType('service');
                    setIsItemModalOpen(true);
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                >
                  + Add Service
                </button>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Rate</th>
                    <th className="px-3 py-2 text-left">Amount</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.type}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">₹{item.rate.toFixed(2)}</td>
                      <td className="px-3 py-2 font-medium">₹{item.amount.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, items: formData.items.filter((i) => i.id !== item.id) })}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {formData.items.length === 0 && (
                <p className="text-center py-4 text-gray-500 text-sm">No items added</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
              <select
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="10">10%</option>
                <option value="20">20%</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Note to Customer</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount ({formData.discount}%):</span>
              <span className="font-medium text-red-600">-₹{totals.discountAmount.toFixed(2)}</span>
            </div>
            {formData.isGST && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST:</span>
                <span className="font-medium">₹{totals.gstAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Grand Total:</span>
              <span className="text-green-600">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              {editingInvoice ? 'Update Invoice' : 'Save Invoice'}
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

      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={`Add ${itemModalType === 'stock' ? 'Stock' : 'Service'}`}>
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder={`Search ${itemModalType}...`}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-lg">
            {filteredItems.map((item: any) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 ${
                  selectedItem === item.id ? 'bg-blue-50' : ''
                }`}
              >
                <p className="font-medium">{itemModalType === 'stock' ? item.productName : item.serviceName}</p>
                <p className="text-sm text-gray-600">
                  ₹{itemModalType === 'stock' ? item.sellingPrice.toFixed(2) : item.labour.toFixed(2)}
                </p>
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <input
              type="number"
              step="1"
              min="1"
              value={itemQuantity}
              onChange={(e) => setItemQuantity(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!selectedItem}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add to Invoice
            </button>
            <button
              type="button"
              onClick={() => {
                setIsItemModalOpen(false);
                setSelectedItem('');
                setItemQuantity('1');
                setItemSearch('');
              }}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!viewingInvoice} onClose={() => setViewingInvoice(null)} title="Invoice Preview">
        {viewingInvoice && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Invoice #{viewingInvoice.invoiceNumber}</h3>
                <p className="text-gray-600">Date: {viewingInvoice.invoiceDate}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Printer size={18} />
                Print
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Customer Details</h4>
                <p className="text-sm">{viewingInvoice.customer.name}</p>
                <p className="text-sm text-gray-600">{viewingInvoice.customer.address}</p>
                <p className="text-sm text-gray-600">{viewingInvoice.customer.phone}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Vehicle Details</h4>
                <p className="text-sm">{viewingInvoice.customer.vehicleNumber}</p>
                <p className="text-sm text-gray-600">{viewingInvoice.customer.make} {viewingInvoice.customer.model}</p>
                <p className="text-sm text-gray-600">{viewingInvoice.customer.kilometer} km</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    {viewingInvoice.isGST && <th className="px-4 py-3 text-right">GST</th>}
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">₹{item.rate.toFixed(2)}</td>
                      {viewingInvoice.isGST && <td className="px-4 py-3 text-right">{item.gst}%</td>}
                      <td className="px-4 py-3 text-right font-medium">₹{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{viewingInvoice.subtotal.toFixed(2)}</span>
              </div>
              {viewingInvoice.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount ({viewingInvoice.discount}%):</span>
                  <span>-₹{((viewingInvoice.subtotal * viewingInvoice.discount) / 100).toFixed(2)}</span>
                </div>
              )}
              {viewingInvoice.isGST && (
                <div className="flex justify-between">
                  <span>GST:</span>
                  <span>₹{viewingInvoice.gstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Grand Total:</span>
                <span className="text-green-600">₹{viewingInvoice.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {viewingInvoice.note && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Note</h4>
                <p className="text-sm">{viewingInvoice.note}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
