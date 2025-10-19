import { useState, useEffect } from 'react';
import { Users, FileText, TrendingUp, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import {
  getDashboardStats,
  getAllInvoices,
  Invoice,
  recalculateAllCountersAndRevenues,
  DashboardStats,
} from '../services/InvoiceService';
import { getCustomersPaginated } from '../services/CustomerService';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    monthlyCounters: [],
    monthlyRevenues: [],
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats
      const dashboardStats = await getDashboardStats();
      setStats(dashboardStats);
      
      // Load recent invoices
      const allInvoices = await getAllInvoices();
      setRecentInvoices(allInvoices.slice(0, 5));
      
      // Load customers count
      const customersData = await getCustomersPaginated(1, 1000);
      setCustomersCount(customersData.customers.length);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!confirm('Recalculate all monthly counters and revenues? This may take some time.')) {
      return;
    }

    try {
      setRecalculating(true);
      const result = await recalculateAllCountersAndRevenues((current, total) => {
        setRecalcProgress({ current, total });
      });
      
      alert(result.message);
      await loadDashboardData();
    } catch (error) {
      console.error('Error recalculating:', error);
      alert('Failed to recalculate data');
    } finally {
      setRecalculating(false);
    }
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthData = stats.monthlyCounters.find(c => c.yearMonth === currentMonth);
  const currentMonthRevenue = stats.monthlyRevenues.find(r => r.yearMonth === currentMonth);

  const mainStats = [
    {
      label: 'Total Customers',
      value: customersCount,
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      label: 'Total Invoices',
      value: stats.totalInvoices,
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  const revenueStats = [
    {
      label: 'Total Revenue',
      value: `₹${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'This Month',
      value: `₹${(currentMonthRevenue?.revenue || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'from-sky-500 to-sky-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h2>
            <p className="text-gray-600">Welcome to Ryuworks Billing Software</p>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={18} className={recalculating ? 'animate-spin' : ''} />
            {recalculating ? 'Recalculating...' : 'Recalc Stats'}
          </button>
        </div>
        
        {recalculating && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Recalculating monthly data...</span>
              <span>{recalcProgress.current} / {recalcProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${recalcProgress.total > 0 ? (recalcProgress.current / recalcProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mainStats.map((stat) => {
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

      {/* Monthly Invoice Counters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-blue-600" size={24} />
          <h3 className="text-xl font-bold text-gray-800">Monthly Invoice Counters</h3>
        </div>
        
        {stats.monthlyCounters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.monthlyCounters.slice(0, 6).map((counter) => {
              const revenue = stats.monthlyRevenues.find(r => r.yearMonth === counter.yearMonth);
              const isCurrent = counter.yearMonth === currentMonth;
              
              return (
                <div
                  key={counter.yearMonth}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className={`font-semibold ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}>
                      {counter.monthName}
                    </p>
                    {isCurrent && (
                      <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-800 mb-1">
                    {counter.count} <span className="text-sm text-gray-600">invoices</span>
                  </p>
                  <p className="text-sm text-green-600 font-medium">
                    ₹{(revenue?.revenue || 0).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">
            No monthly data yet. Create invoices to see statistics.
          </p>
        )}
        
        {stats.monthlyCounters.length > 6 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Showing 6 most recent months • Total: {stats.monthlyCounters.length} months
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Invoices</h3>
        <div className="space-y-3">
          {recentInvoices.length > 0 ? (
            recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <p className="font-medium text-gray-800">Invoice #{invoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-600">{invoice.customerName}</p>
                  <p className="text-xs text-gray-500">{invoice.vehicleNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">₹{invoice.totalAmount.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">{invoice.date}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                      invoice.invoiceType === 'GST'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {invoice.invoiceType}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">No invoices yet. Create your first invoice!</p>
          )}
        </div>
      </div>
    </div>
  );
}

// import { useApp } from '../contexts/AppContext';
// import { Package, Wrench, Users, FileText, TrendingUp, DollarSign } from 'lucide-react';

// export function Dashboard() {
//   const { stocks, services, customers, invoices } = useApp();

//   const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
//   const thisMonthInvoices = invoices.filter((inv) => {
//     const invDate = new Date(inv.invoiceDate);
//     const now = new Date();
//     return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
//   });

//   const stats = [
//     {
//       label: 'Total Stocks',
//       value: stocks.length,
//       icon: Package,
//       color: 'from-blue-500 to-blue-600',
//       bgColor: 'bg-blue-50',
//       textColor: 'text-blue-600',
//     },
//     {
//       label: 'Total Services',
//       value: services.length,
//       icon: Wrench,
//       color: 'from-green-500 to-green-600',
//       bgColor: 'bg-green-50',
//       textColor: 'text-green-600',
//     },
//     {
//       label: 'Total Customers',
//       value: customers.length,
//       icon: Users,
//       color: 'from-orange-500 to-orange-600',
//       bgColor: 'bg-orange-50',
//       textColor: 'text-orange-600',
//     },
//     {
//       label: 'Total Invoices',
//       value: invoices.length,
//       icon: FileText,
//       color: 'from-purple-500 to-purple-600',
//       bgColor: 'bg-purple-50',
//       textColor: 'text-purple-600',
//     },
//   ];

//   const revenueStats = [
//     {
//       label: 'Total Revenue',
//       value: `₹${totalRevenue.toFixed(2)}`,
//       icon: DollarSign,
//       color: 'from-emerald-500 to-emerald-600',
//     },
//     {
//       label: 'This Month',
//       value: thisMonthInvoices.length,
//       icon: TrendingUp,
//       color: 'from-sky-500 to-sky-600',
//     },
//   ];

//   return (
//     <div className="space-y-6">
//       <div className="bg-white rounded-lg shadow-md p-6">
//         <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h2>
//         <p className="text-gray-600">Welcome to your Garage Billing System</p>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//         {stats.map((stat) => {
//           const Icon = stat.icon;
//           return (
//             <div key={stat.label} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
//                   <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
//                 </div>
//                 <div className={`${stat.bgColor} p-4 rounded-lg`}>
//                   <Icon size={28} className={stat.textColor} />
//                 </div>
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {revenueStats.map((stat) => {
//           const Icon = stat.icon;
//           return (
//             <div
//               key={stat.label}
//               className={`bg-gradient-to-r ${stat.color} text-white rounded-lg shadow-lg p-6`}
//             >
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-white text-opacity-90 mb-2">{stat.label}</p>
//                   <p className="text-3xl font-bold">{stat.value}</p>
//                 </div>
//                 <div className="bg-white bg-opacity-20 p-4 rounded-lg">
//                   <Icon size={32} />
//                 </div>
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       <div className="bg-white rounded-lg shadow-md p-6">
//         <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
//         <div className="space-y-3">
//           {invoices.slice(0, 5).map((invoice) => (
//             <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
//               <div>
//                 <p className="font-medium text-gray-800">Invoice #{invoice.invoiceNumber}</p>
//                 <p className="text-sm text-gray-600">{invoice.customer.name}</p>
//               </div>
//               <div className="text-right">
//                 <p className="font-bold text-green-600">₹{invoice.grandTotal.toFixed(2)}</p>
//                 <p className="text-sm text-gray-600">{invoice.invoiceDate}</p>
//               </div>
//             </div>
//           ))}
//           {invoices.length === 0 && (
//             <p className="text-center text-gray-500 py-4">No invoices yet. Create your first invoice!</p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
