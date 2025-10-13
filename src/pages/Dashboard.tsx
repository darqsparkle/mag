import { useApp } from '../contexts/AppContext';
import { Package, Wrench, Users, FileText, TrendingUp, DollarSign } from 'lucide-react';

export function Dashboard() {
  const { stocks, services, customers, invoices } = useApp();

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const thisMonthInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.invoiceDate);
    const now = new Date();
    return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
  });

  const stats = [
    {
      label: 'Total Stocks',
      value: stocks.length,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Total Services',
      value: services.length,
      icon: Wrench,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      label: 'Total Customers',
      value: customers.length,
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      label: 'Total Invoices',
      value: invoices.length,
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  const revenueStats = [
    {
      label: 'Total Revenue',
      value: `₹${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'This Month',
      value: thisMonthInvoices.length,
      icon: TrendingUp,
      color: 'from-sky-500 to-sky-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h2>
        <p className="text-gray-600">Welcome to your Garage Billing System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-4 rounded-lg`}>
                  <Icon size={28} className={stat.textColor} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {revenueStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`bg-gradient-to-r ${stat.color} text-white rounded-lg shadow-lg p-6`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-opacity-90 mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <Icon size={32} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {invoices.slice(0, 5).map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Invoice #{invoice.invoiceNumber}</p>
                <p className="text-sm text-gray-600">{invoice.customer.name}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">₹{invoice.grandTotal.toFixed(2)}</p>
                <p className="text-sm text-gray-600">{invoice.invoiceDate}</p>
              </div>
            </div>
          ))}
          {invoices.length === 0 && (
            <p className="text-center text-gray-500 py-4">No invoices yet. Create your first invoice!</p>
          )}
        </div>
      </div>
    </div>
  );
}
