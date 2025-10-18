
import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import WhatsApp from "../components/Whatsapp";
import { Plus, LogOut, FileText, Search } from "lucide-react";
import JobcardForm from "../components/JobcardForm";
import JobcardList from "../components/JobcardList";
import DownloadJobcard from "../components/DownloadJobcard";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  QueryConstraint,
  DocumentSnapshot,
  Timestamp,
  doc,
  serverTimestamp,
  writeBatch,
  getDoc,
} from "firebase/firestore";

// Types
interface PaginationState {
  lastDocument: DocumentSnapshot | null;
  hasMore: boolean;
  loading: boolean;
  currentPage: number;
}

interface FilterState {
  status: "All" | Jobcard["status"];
  searchTerm: string;
  workType: "All" | Jobcard["workType"];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

// Convert Firestore Timestamp to Date
interface FirestoreJobcard extends Omit<Jobcard, "dateCreated"> {
  dateCreated: Timestamp;
}

interface Jobcard {
  id: string;
  jobcardNumber: string;
  dateCreated: Date;
  vehicleRegistration: string;
  customerName: string;
  mobileNumber: string;
  gstNumber?: string;
  address?: string;
  chassisNumber?: string;
  kilometer: string;
  model: string;
  workType: "General Service" | "Running Repair" | "Body Shop";
  complaints: string[];
  status: "Open" | "In Progress" | "Closed";
}

interface User {
  username: string;
  email: string;
}

// Main Jobcard Component
export default function Jobcard() {
  const [user, setUser] = useState<User>({ username: "", email: "" });
  const [jobcards, setJobcards] = useState<Jobcard[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [selectedJobcard, setSelectedJobcard] = useState<Jobcard | null>(null);
  const [editingJobcard, setEditingJobcard] = useState<Jobcard | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [selectedDownloadJobcard, setSelectedDownloadJobcard] = useState<Jobcard | null>(null);

  // Consolidated filter state
  const [filters, setFilters] = useState<FilterState>({
    status: "All",
    searchTerm: "",
    workType: "All",
    dateRange: { start: null, end: null },
  });

  const [pagination, setPagination] = useState<PaginationState>({
    lastDocument: null,
    hasMore: true,
    loading: false,
    currentPage: 1,
  });
  const [stats, setStats] = useState({
  total: 0,
  open: 0,
  inProgress: 0,
  closed: 0,
  loading: true
});

  const [isLoading, setIsLoading] = useState(false);

  // Initialize user data and load jobcards
  useEffect(() => {
    if (auth.currentUser) {
      setUser({
        username: auth.currentUser.displayName || "User",
        email: auth.currentUser.email || "",
      });
      loadInitialJobcards();
    }
  }, []);

  // Search effect with debouncing
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (filters.searchTerm) {
        performSearch();
      } else {
        loadInitialJobcards();
      }
    }, 300); // Debounce search

    return () => clearTimeout(searchTimeout);
  }, [filters.searchTerm, filters.status]);
  // Load statistics on component mount
useEffect(() => {
  if (auth.currentUser) {
    loadStatistics();
  }
}, []);

  const loadInitialJobcards = async () => {
  setIsLoading(true);
  
  try {
    // Wait for database fetch to complete
    const result = await fetchJobcards(filters, {
      ...pagination,
      lastDocument: null,
    });
    
    // Only update state after successful fetch
    setJobcards(result.jobcards);
    setPagination((prev) => ({
      ...prev,
      lastDocument: result.lastDocument,
      hasMore: result.hasMore,
    }));
  } catch (error) {
    console.error("Error loading jobcards:", error);
    // Keep empty state on failure, show error message
    setJobcards([]);
    alert("Error loading jobcards. Please refresh the page.");
  } finally {
    setIsLoading(false);
  }
};
// stat loading
// Method 1: Get total jobcards count
const getTotalJobcardsCount = async (): Promise<number> => {
  try {
    const snapshot = await getDocs(collection(db, "jobcards"));
    return snapshot.size;
  } catch (error) {
    console.error("Error fetching total jobcards count:", error);
    return 0;
  }
};

// Method 2: Get open jobcards count
const getOpenJobcardsCount = async (): Promise<number> => {
  try {
    const snapshot = await getDocs(collection(db, "openJobcards"));
    return snapshot.size;
  } catch (error) {
    console.error("Error fetching open jobcards count:", error);
    return 0;
  }
};

// Method 3: Get closed jobcards count
const getClosedJobcardsCount = async (): Promise<number> => {
  try {
    const snapshot = await getDocs(collection(db, "closedJobcards"));
    return snapshot.size;
  } catch (error) {
    console.error("Error fetching closed jobcards count:", error);
    return 0;
  }
};

// Combined method to load all stats
const loadStatistics = async () => {
  setStats(prev => ({ ...prev, loading: true }));
  
  try {
    const [total, open, closed] = await Promise.all([
      getTotalJobcardsCount(),
      getOpenJobcardsCount(),
      getClosedJobcardsCount()
    ]);
    
    // Calculate in progress from your inProgressJobcards collection
    const inProgressSnapshot = await getDocs(collection(db, "inProgressJobcards"));
    const inProgress = inProgressSnapshot.size;
    
    setStats({
      total,
      open,
      inProgress,
      closed,
      loading: false
    });
  } catch (error) {
    console.error("Error loading statistics:", error);
    setStats(prev => ({ ...prev, loading: false }));
  }
};

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const result = await searchJobcards(filters.searchTerm, filters, pagination);
      setJobcards(result.jobcards);
      setPagination(prev => ({
        ...prev,
        lastDocument: result.lastDocument,
        hasMore: result.hasMore
      }));
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOptimizedCollection = (status: FilterState["status"]): string => {
    switch (status) {
      case "Open":
        return "openJobcards";
      case "In Progress":
        return "inProgressJobcards";
      case "Closed":
        return "closedJobcards";
      default:
        return "jobcards"; // Main collection for "All" status
    }
  };

  const getStatusCollection = (status: string): string => {
    switch (status) {
      case "Open":
        return "openJobcards";
      case "In Progress":
        return "inProgressJobcards";
      case "Closed":
        return "closedJobcards";
      default:
        return "openJobcards";
    }
  };

  const getDateBasedCollectionName = (
    baseCollection: string,
    date = new Date()
  ): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${baseCollection}-${year}-${month}`;
  };

  const fetchJobcards = async (
    filters: FilterState,
    pagination: PaginationState,
    pageSize: number = 20
  ): Promise<{
    jobcards: Jobcard[];
    lastDocument: DocumentSnapshot | null;
    hasMore: boolean;
  }> => {
    try {
      const constraints: QueryConstraint[] = [];

      // Determine which collection to query based on status filter
      const collectionName = getOptimizedCollection(filters.status);
      const baseCollection = collection(db, collectionName);

      // Add status filter (if not using status-specific collection)
      if (filters.status !== "All" && collectionName === "jobcards") {
        constraints.push(where("status", "==", filters.status));
      }

      // Add work type filter
      if (filters.workType !== "All") {
        constraints.push(where("workType", "==", filters.workType));
      }

      // Add date range filter
      if (filters.dateRange.start) {
        constraints.push(
          where(
            "dateCreated",
            ">=",
            Timestamp.fromDate(filters.dateRange.start)
          )
        );
      }
      if (filters.dateRange.end) {
        constraints.push(
          where("dateCreated", "<=", Timestamp.fromDate(filters.dateRange.end))
        );
      }

      // Order by dateCreated (descending for newest first)
      constraints.push(orderBy("dateCreated", "desc"));

      // Add pagination
      constraints.push(limit(pageSize));
      if (pagination.lastDocument) {
        constraints.push(startAfter(pagination.lastDocument));
      }

      const q = query(baseCollection, ...constraints);
      const snapshot = await getDocs(q);

      const jobcards: Jobcard[] = snapshot.docs.map((doc) => {
        const data = doc.data() as FirestoreJobcard;
        return {
          ...data,
          dateCreated: data.dateCreated.toDate(),
        };
      });

      return {
        jobcards,
        lastDocument: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize,
      };
    } catch (error) {
      console.error("Error fetching jobcards:", error);
      throw error;
    }
  };

  const searchJobcards = async (
    searchTerm: string,
    filters: FilterState,
    pagination: PaginationState
  ): Promise<{
    jobcards: Jobcard[];
    lastDocument: DocumentSnapshot | null;
    hasMore: boolean;
  }> => {
    try {
      // For exact matches, use Firestore queries
      if (searchTerm.length >= 3) {
        // Search by jobcard number
        if (searchTerm.match(/^\d+$/)) {
          return await searchByJobcardNumber(searchTerm, filters);
        }

        // Search by vehicle registration
        if (searchTerm.match(/^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/)) {
          return await searchByVehicleRegistration(searchTerm, filters);
        }

        // Search by customer name
        return await searchByCustomerName(searchTerm, filters);
      }

      // For short searches, fall back to client-side filtering
      const allJobcards = await fetchJobcards(
        filters,
        { ...pagination, lastDocument: null },
        100
      );
      const filtered = allJobcards.jobcards.filter(
        (jobcard) =>
          jobcard.customerName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          jobcard.mobileNumber.includes(searchTerm) ||
          jobcard.vehicleRegistration
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );

      return {
        jobcards: filtered,
        lastDocument: allJobcards.lastDocument,
        hasMore: false,
      };
    } catch (error) {
      console.error("Error searching jobcards:", error);
      throw error;
    }
  };

  const searchByJobcardNumber = async (
    jobcardNumber: string,
    filters: FilterState
  ): Promise<{
    jobcards: Jobcard[];
    lastDocument: DocumentSnapshot | null;
    hasMore: boolean;
  }> => {
    const collectionName = getOptimizedCollection(filters.status);
    const q = query(
      collection(db, collectionName),
      where("jobcardNumber", "==", jobcardNumber),
      orderBy("dateCreated", "desc"),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const jobcards = snapshot.docs.map((doc) => ({
      ...doc.data(),
      dateCreated: doc.data().dateCreated.toDate(),
    })) as Jobcard[];

    return {
      jobcards,
      lastDocument: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: false,
    };
  };

  const searchByVehicleRegistration = async (
    vehicleReg: string,
    filters: FilterState
  ): Promise<{
    jobcards: Jobcard[];
    lastDocument: DocumentSnapshot | null;
    hasMore: boolean;
  }> => {
    const collectionName = getOptimizedCollection(filters.status);
    const q = query(
      collection(db, collectionName),
      where("vehicleRegistration", "==", vehicleReg.toUpperCase()),
      orderBy("dateCreated", "desc"),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const jobcards = snapshot.docs.map((doc) => ({
      ...doc.data(),
      dateCreated: doc.data().dateCreated.toDate(),
    })) as Jobcard[];

    return {
      jobcards,
      lastDocument: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === 20,
    };
  };

  const searchByCustomerName = async (
    customerName: string,
    filters: FilterState
  ): Promise<{
    jobcards: Jobcard[];
    lastDocument: DocumentSnapshot | null;
    hasMore: boolean;
  }> => {
    // This requires storing searchTokens array in documents
    const searchToken = customerName.toLowerCase();
    const collectionName = getOptimizedCollection(filters.status);

    const q = query(
      collection(db, collectionName),
      where("searchTokens", "array-contains", searchToken),
      orderBy("dateCreated", "desc"),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const jobcards = snapshot.docs.map((doc) => ({
      ...doc.data(),
      dateCreated: doc.data().dateCreated.toDate(),
    })) as Jobcard[];

    return {
      jobcards,
      lastDocument: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === 20,
    };
  };

  const loadMoreJobcards = async (
    currentJobcards: Jobcard[],
    filters: FilterState,
    pagination: PaginationState
  ): Promise<{
    newJobcards: Jobcard[];
    updatedPagination: PaginationState;
  }> => {
    if (!pagination.hasMore || pagination.loading) {
      return { newJobcards: [], updatedPagination: pagination };
    }

    const result = await fetchJobcards(filters, pagination);

    return {
      newJobcards: result.jobcards,
      updatedPagination: {
        ...pagination,
        lastDocument: result.lastDocument,
        hasMore: result.hasMore,
        currentPage: pagination.currentPage + 1,
      },
    };
  };

  const updateJobcardStatus = async (
    jobcardId: string,
    newStatus: Jobcard["status"],
    oldStatus: Jobcard["status"]
  ): Promise<void> => {
    try {
      const batch = writeBatch(db);

      // Get the current jobcard data first
      const mainRef = doc(db, "jobcards", jobcardId);
      const jobcardDoc = await getDoc(mainRef);

      if (!jobcardDoc.exists()) {
        throw new Error("Jobcard not found");
      }

      const jobcardData = jobcardDoc.data();
      const updateData = {
        ...jobcardData,
        status: newStatus,
        updatedAt: serverTimestamp(),
      };

      // 1. Update main collection
      batch.update(mainRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // 2. Update date-based collection
      const dateBasedCollection = getDateBasedCollectionName(
        "jobcards",
        new Date(jobcardData.dateCreated.toDate())
      );
      const dateBasedRef = doc(db, dateBasedCollection, jobcardId);
      batch.update(dateBasedRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // 3. Move between status collections
      const oldStatusCollection = getStatusCollection(oldStatus);
      const newStatusCollection = getStatusCollection(newStatus);

      if (oldStatusCollection !== newStatusCollection) {
        // Remove from old status collection
        const oldStatusRef = doc(db, oldStatusCollection, jobcardId);
        batch.delete(oldStatusRef);

        // Add to new status collection
        const newStatusRef = doc(db, newStatusCollection, jobcardId);
        batch.set(newStatusRef, updateData);
      } else {
        // Update in the same collection
        const statusRef = doc(db, newStatusCollection, jobcardId);
        batch.update(statusRef, {
          status: newStatus,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error("Error updating jobcard status:", error);
      throw error;
    }
  };

  const editJobcard = async (jobcardId: string, updatedData: Partial<Jobcard>): Promise<void> => {
    try {
      const batch = writeBatch(db);
      const updateData = {
        ...updatedData,
        updatedAt: serverTimestamp()
      };

      // Update main collection
      const mainRef = doc(db, 'jobcards', jobcardId);
      batch.update(mainRef, updateData);

      // Update status-based collection
      const jobcard = jobcards.find(jc => jc.id === jobcardId);
      if (jobcard) {
        const statusCollection = getStatusCollection(jobcard.status);
        const statusRef = doc(db, statusCollection, jobcardId);
        batch.update(statusRef, updateData);

        // Update date-based collection
        const dateCollection = getDateBasedCollectionName('jobcards', jobcard.dateCreated);
        const dateRef = doc(db, dateCollection, jobcardId);
        batch.update(dateRef, updateData);
      }

      await batch.commit();
    } catch (error) {
      console.error('Error editing jobcard:', error);
      throw error;
    }
  };

  const deleteJobcard = async (jobcardId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      const jobcard = jobcards.find(jc => jc.id === jobcardId);
      
      if (!jobcard) throw new Error('Jobcard not found');

      // Delete from main collection
      const mainRef = doc(db, 'jobcards', jobcardId);
      batch.delete(mainRef);

      // Delete from status-based collection
      const statusCollection = getStatusCollection(jobcard.status);
      const statusRef = doc(db, statusCollection, jobcardId);
      batch.delete(statusRef);

      // Delete from date-based collection
      const dateCollection = getDateBasedCollectionName('jobcards', jobcard.dateCreated);
      const dateRef = doc(db, dateCollection, jobcardId);
      batch.delete(dateRef);

      await batch.commit();
    } catch (error) {
      console.error('Error deleting jobcard:', error);
      throw error;
    }
  };

  // Event Handlers
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleLoadMore = async () => {
  if (!pagination.hasMore || pagination.loading) return;
  
  // Set loading state
  setPagination(prev => ({ ...prev, loading: true }));
  
  const originalJobcards = [...jobcards];
  const originalPagination = { ...pagination };
  
  try {
    // Wait for data fetch to complete
    const result = await loadMoreJobcards(jobcards, filters, pagination);
    
    // Only update state after successful fetch
    setJobcards(prev => [...prev, ...result.newJobcards]);
    setPagination(result.updatedPagination);
  } catch (error) {
    console.error('Error loading more:', error);
    // Restore original state on failure
    setJobcards(originalJobcards);
    setPagination(originalPagination);
    alert("Error loading more jobcards. Please try again.");
  }
};

  const handleDownloadJobcard = (jobcard: Jobcard) => {
    setSelectedDownloadJobcard(jobcard);
    setShowDownload(true);
  };

  const handleCreateJobcard = (newJobcard: Jobcard) => {
  setJobcards((prev) => [newJobcard, ...prev]);
  setShowForm(false);
  loadStatistics();
};

  const handleEditJobcard = (jobcard: Jobcard) => {
    setEditingJobcard(jobcard);
    setShowEditForm(true);
  };

  const handleUpdateJobcard = (updatedJobcard: Jobcard) => {
    setJobcards((prev) =>
      prev.map((jc) => (jc.id === updatedJobcard.id ? updatedJobcard : jc))
    );
    setShowEditForm(false);
    setEditingJobcard(null);
  };

  const handleDeleteJobcard = async (jobcardId: string) => {
  const confirmDelete = window.confirm("Do you want to Delete this jobcard?");
  if (!confirmDelete) return;

  const originalJobcards = [...jobcards];

  try {
    // Wait for database deletion to complete
    await deleteJobcard(jobcardId);
    
    // Only update state after successful deletion
    setJobcards((prev) => prev.filter((jc) => jc.id !== jobcardId));
    alert("Jobcard deleted successfully!"); 
    loadStatistics();
  } catch (error) {
    console.error("Error deleting jobcard:", error);
    // Restore original state on failure
    setJobcards(originalJobcards);
    alert("Error deleting jobcard. Please try again.");
  }
};

  const handleUpdateStatus = async (id: string, newStatus: Jobcard["status"]) => {
  const jobcard = jobcards.find((jc) => jc.id === id);
  if (!jobcard) return;

  // Show loading state (optional)
  const originalJobcards = [...jobcards];
  
  try {
    // Wait for database operation to complete
    await updateJobcardStatus(id, newStatus, jobcard.status);

    // Only update state after successful database operation
    setJobcards((prev) =>
      prev.map((jc) => (jc.id === id ? { ...jc, status: newStatus } : jc))
    );
    loadStatistics();
  } catch (error) {
    console.error("Error updating status:", error);
    // Keep original state on failure
    setJobcards(originalJobcards);
    alert("Error updating status. Please try again.");
  }
};

  const handleWhatsAppClick = (jobcard: Jobcard) => {
    setSelectedJobcard(jobcard);
    setShowWhatsApp(true);
  };

  const handleStatusChange = (newStatus: "All" | Jobcard["status"]) => {
    setFilters(prev => ({ ...prev, status: newStatus }));
  };

  const handleSearchChange = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-900">
                JobCard Repair Orders
              </h1>
            </div>
            
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by jobcard number, customer name, vehicle reg..."
                  value={filters.searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={filters.status}
                onChange={(e) => handleStatusChange(e.target.value as "All" | Jobcard["status"])}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 transform hover:scale-[1.02] font-medium"
              >
                <Plus className="w-5 h-5" />
                Add New Jobcard
              </button>
            </div>
          </div>

          {/* Stats */}
          {/* Stats */}
<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
  <div className="bg-white p-4 rounded-lg border border-gray-200">
    <div className="text-2xl font-bold text-gray-900">
      {stats.loading ? (
        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
      ) : (
        stats.total
      )}
    </div>
    <div className="text-sm text-gray-500">Total Jobcards</div>
  </div>
  <div className="bg-white p-4 rounded-lg border border-gray-200">
    <div className="text-2xl font-bold text-blue-600">
      {stats.loading ? (
        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
      ) : (
        stats.open
      )}
    </div>
    <div className="text-sm text-gray-500">Open</div>
  </div>
  <div className="bg-white p-4 rounded-lg border border-gray-200">
    <div className="text-2xl font-bold text-yellow-600">
      {stats.loading ? (
        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
      ) : (
        stats.inProgress
      )}
    </div>
    <div className="text-sm text-gray-500">In Progress</div>
  </div>
  <div className="bg-white p-4 rounded-lg border border-gray-200">
    <div className="text-2xl font-bold text-green-600">
      {stats.loading ? (
        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
      ) : (
        stats.closed
      )}
    </div>
    <div className="text-sm text-gray-500">Closed</div>
  </div>
</div>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="text-center py-4">
            <div className="text-gray-500">Loading jobcards...</div>
          </div>
        )}

        {/* Jobcard List */}
        <JobcardList
          jobcards={jobcards}
          onUpdateStatus={handleUpdateStatus}
          onWhatsAppClick={handleWhatsAppClick}
          onEditJobcard={handleEditJobcard}
          onDeleteJobcard={handleDeleteJobcard}
          onDownloadJobcard={handleDownloadJobcard}
          onLoadMore={handleLoadMore}
          hasMore={pagination.hasMore}
          loading={pagination.loading}
        />

        {/* Form Modal */}
        {showForm && (
          <JobcardForm
            onSubmit={handleCreateJobcard}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Edit Form Modal */}
        {showEditForm && editingJobcard && (
          <JobcardForm
            jobcard={editingJobcard}
            onSubmit={handleUpdateJobcard}
            onCancel={() => {
              setShowEditForm(false);
              setEditingJobcard(null);
              loadStatistics();
            }}
            editJobcard={editJobcard}
          />
        )}

        {/* WhatsApp Modal */}
        {showWhatsApp && selectedJobcard && (
          <WhatsApp
            jobcard={selectedJobcard}
            isOpen={showWhatsApp}
            onClose={() => {
              setShowWhatsApp(false);
              setSelectedJobcard(null);
            }}
          />
        )}

        {/* Download Modal */}
        {showDownload && selectedDownloadJobcard && (
          <DownloadJobcard
            jobcard={selectedDownloadJobcard}
            isOpen={showDownload}
            onClose={() => {
              setShowDownload(false);
              setSelectedDownloadJobcard(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
