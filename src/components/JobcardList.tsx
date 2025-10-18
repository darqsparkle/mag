import { DocumentSnapshot } from "firebase/firestore";
import { Download } from "lucide-react";
import { Edit2, Trash2 } from "lucide-react";
import {
  Plus,
  LogOut,
  FileText,
  Search,
  Calendar,
  Phone,
  Car,
  Wrench,
  MapPin,
  Hash,
  Gauge,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageCircle,
} from "lucide-react";

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

interface JobcardListProps {
  jobcards: Jobcard[];
  onUpdateStatus: (id: string, status: Jobcard["status"]) => void;
  onWhatsAppClick: (jobcard: Jobcard) => void;
  onEditJobcard: (jobcard: Jobcard) => void;
  onDeleteJobcard: (jobcardId: string) => void;
  onDownloadJobcard: (jobcard: Jobcard) => void; // Add this line
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}
interface User {
  username: string;
  email: string;
}

function JobcardList({
  jobcards,
  onUpdateStatus,
  onWhatsAppClick,
  onEditJobcard,
  onDeleteJobcard,
  onDownloadJobcard,
  onLoadMore,
  hasMore = false,
  loading = false,
}: JobcardListProps) {
  const getStatusColor = (status: Jobcard["status"]) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800";
      case "Closed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: Jobcard["status"]) => {
    switch (status) {
      case "Open":
        return <AlertCircle className="w-4 h-4" />;
      case "In Progress":
        return <Clock className="w-4 h-4" />;
      case "Closed":
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  if (jobcards.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No jobcards found
        </h3>
        <p className="text-gray-600">
          Create your first jobcard to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {jobcards.map((jobcard) => (
        <div
          key={jobcard.id}
          className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {jobcard.jobcardNumber}
                  </h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {jobcard.dateCreated.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    jobcard.status
                  )}`}
                >
                  {getStatusIcon(jobcard.status)}
                  {jobcard.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Car className="w-4 h-4 text-gray-500" />
                <span className="font-medium">
                  {jobcard.vehicleRegistration}
                </span>
                <span className="text-gray-600">({jobcard.model})</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{jobcard.customerName}</span>
                <span className="text-gray-600">{jobcard.mobileNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Gauge className="w-4 h-4 text-gray-500" />
                <span>{jobcard.kilometer} km</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wrench className="w-4 h-4 text-gray-500" />
                <span>{jobcard.workType}</span>
              </div>
              {jobcard.gstNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <span>GST: {jobcard.gstNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="truncate">{jobcard.address}</span>
              </div>
            </div>

            {jobcard.complaints.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Complaints:
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {jobcard.complaints.map((complaint, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                      {complaint}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Update Status:</span>
                <select
                  value={jobcard.status}
                  onChange={(e) =>
                    onUpdateStatus(
                      jobcard.id,
                      e.target.value as Jobcard["status"]
                    )
                  }
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </select>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onWhatsAppClick(jobcard)}
                    className="flex items-center gap-1 px-3 py-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>

                  <button
                    onClick={() => onDownloadJobcard(jobcard)} // Add this new prop
                    className="flex items-center gap-1 px-3 py-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>

                  <button
                    onClick={() => onEditJobcard(jobcard)}
                    className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>

                  <button
                    onClick={() => onDeleteJobcard(jobcard.id)}
                    className="flex items-center gap-1 px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      ))}
      {/* Load More Button */}
{hasMore && (
  <div className="text-center mt-6">
    <button
      onClick={onLoadMore}
      disabled={loading}
      className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Loading..." : "Load More"}
    </button>
  </div>
)}
    </div>
  );
}

export default JobcardList;
