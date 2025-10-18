import React, { useState } from "react";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

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

interface JobcardFormProps {
  onSubmit: (jobcard: Jobcard) => void;
  onCancel: () => void;
  jobcard?: Jobcard;
  editJobcard?: (id: string, data: Partial<Jobcard>) => Promise<void>; // Add this
}

interface FormData {
  vehicleRegistration: string;
  customerName: string;
  mobileNumber: string;
  gstNumber: string;
  address: string;
  chassisNumber: string;
  kilometer: string;
  model: string;
  workType: "General Service" | "Running Repair" | "Body Shop";
  complaints: string[];
}

interface ValidationErrors {
  [key: string]: string;
}

function JobcardForm({
  onSubmit,
  onCancel,
  jobcard,
  editJobcard,
}: JobcardFormProps) {
  const isEditing = !!jobcard;
  const [formData, setFormData] = useState<FormData>({
    vehicleRegistration: jobcard?.vehicleRegistration || "",
    customerName: jobcard?.customerName || "",
    mobileNumber: jobcard?.mobileNumber || "",
    gstNumber: jobcard?.gstNumber || "",
    address: jobcard?.address || "",
    chassisNumber: jobcard?.chassisNumber || "",
    kilometer: jobcard?.kilometer || "",
    model: jobcard?.model || "",
    workType: jobcard?.workType || "General Service",
    complaints: jobcard?.complaints || [""],
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const generateJobcardNumber = async (): Promise<number> => {
    try {
      const counterRef = doc(db, "counters", "jobcardCounter");
      const counterDoc = await getDoc(counterRef);

      let nextNumber = 1;
      if (counterDoc.exists()) {
        nextNumber = counterDoc.data().count + 1;
      }

      return nextNumber;
    } catch (error) {
      console.error("Error generating jobcard number:", error);
      throw error;
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

  const handleCreateJobcard = async (
    jobcardData: FormData
  ): Promise<{ success: boolean; jobcard: Jobcard }> => {
    try {
      const batch = writeBatch(db);
      const now = new Date();
      const jobcardNumber = await generateJobcardNumber();

      // Generate document ID
      const jobcardId = doc(collection(db, "jobcards")).id;

      // Create the complete jobcard object
      const newJobcard: Jobcard = {
        ...jobcardData,
        id: jobcardId,
        jobcardNumber: jobcardNumber.toString(),
        dateCreated: now, // Use actual Date object for local state
        status: "Open",
      };

      // Data for Firestore (with serverTimestamp)
      const firestoreData = {
        ...jobcardData,
        id: jobcardId,
        jobcardNumber: jobcardNumber.toString(),
        dateCreated: serverTimestamp(),
        status: "Open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 1. Add to main jobcards collection
      const mainJobcardRef = doc(db, "jobcards", jobcardId);
      batch.set(mainJobcardRef, firestoreData);

      // 2. Add to date-based partition
      const dateBasedCollection = getDateBasedCollectionName("jobcards", now);
      const dateBasedRef = doc(db, dateBasedCollection, jobcardId);
      batch.set(dateBasedRef, firestoreData);

      // 3. Add to status-based collection (Open by default)
      const statusRef = doc(db, "openJobcards", jobcardId);
      batch.set(statusRef, firestoreData);

      // 4. Update counter
      const counterRef = doc(db, "counters", "jobcardCounter");
      batch.set(counterRef, { count: jobcardNumber }, { merge: true });

      // Execute all operations
      await batch.commit();

      return { success: true, jobcard: newJobcard };
    } catch (error) {
      console.error("Error creating jobcard:", error);
      throw error;
    }
  };

  const validateJobcardData = (
    formData: FormData
  ): { isValid: boolean; errors: ValidationErrors } => {
    const errors: ValidationErrors = {};

    if (!formData.vehicleRegistration?.trim()) {
      errors.vehicleRegistration = "Vehicle registration is required";
    }

    if (!formData.customerName?.trim()) {
      errors.customerName = "Customer name is required";
    }

    if (!formData.mobileNumber?.trim()) {
      errors.mobileNumber = "Mobile number is required";
    }

    if (!formData.address?.trim()) {
      errors.address = "Address is required";
    }

    if (!formData.kilometer?.trim()) {
      errors.kilometer = "Kilometer is required";
    }

    if (!formData.model?.trim()) {
      errors.model = "Vehicle model is required";
    }

    const filteredComplaints =
      formData.complaints?.filter((c) => c.trim()) || [];
    if (filteredComplaints.length === 0) {
      errors.complaints = "At least one complaint is required";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  const handleSubmit = async (): Promise<void> => {
    const validation = validateJobcardData(formData);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const filteredComplaints = formData.complaints.filter((c) => c.trim());

      if (isEditing) {
  // Edit mode - need to call the parent's edit function
  const updatedJobcard: Jobcard = {
    ...jobcard!,
    ...formData,
    complaints: filteredComplaints,
  };

  // First update in database, then call onSubmit
  if (editJobcard) {
    await editJobcard(jobcard!.id, updatedJobcard);
  }
  onSubmit(updatedJobcard);
} else {
        // Create mode
        const result = await handleCreateJobcard({
          ...formData,
          complaints: filteredComplaints,
        });

        if (result.success) {
          onSubmit(result.jobcard);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(
        "Error " +
          (isEditing ? "updating" : "creating") +
          " jobcard: " +
          errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const addComplaint = (): void => {
    setFormData((prev) => ({
      ...prev,
      complaints: [...prev.complaints, ""],
    }));
  };

  const removeComplaint = (index: number): void => {
    setFormData((prev) => ({
      ...prev,
      complaints: prev.complaints.filter((_, i) => i !== index),
    }));
  };

  const updateComplaint = (index: number, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      complaints: prev.complaints.map((complaint, i) =>
        i === index ? value : complaint
      ),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? "Edit Jobcard" : "Create New Jobcard"}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Registration *
              </label>
              <input
                type="text"
                value={formData.vehicleRegistration}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    vehicleRegistration: e.target.value,
                  }))
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.vehicleRegistration
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="MH12AB1234"
                required
              />
              {errors.vehicleRegistration && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.vehicleRegistration}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerName: e.target.value,
                  }))
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.customerName ? "border-red-500" : "border-gray-300"
                }`}
                required
              />
              {errors.customerName && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.customerName}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={formData.mobileNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    mobileNumber: e.target.value,
                  }))
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.mobileNumber ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="+91 9876543210"
                required
              />
              {errors.mobileNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.mobileNumber}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Number
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    gstNumber: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="27AABCU9603R1ZM"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.address ? "border-red-500" : "border-gray-300"
              }`}
              rows={2}
              required
            />
            {errors.address && (
              <p className="text-red-500 text-sm mt-1">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chassis Number
              </label>
              <input
                type="text"
                value={formData.chassisNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    chassisNumber: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kilometer *
              </label>
              <input
                type="text"
                value={formData.kilometer}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    kilometer: e.target.value,
                  }))
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.kilometer ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="45,000"
                required
              />
              {errors.kilometer && (
                <p className="text-red-500 text-sm mt-1">{errors.kilometer}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Type *
              </label>
              <select
                value={formData.workType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    workType: e.target.value as FormData["workType"],
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="General Service">General Service</option>
                <option value="Running Repair">Running Repair</option>
                <option value="Body Shop">Body Shop</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Model *
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, model: e.target.value }))
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.model ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Maruti Swift VXI"
              required
            />
            {errors.model && (
              <p className="text-red-500 text-sm mt-1">{errors.model}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Complaints *
            </label>
            {formData.complaints.map((complaint, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={complaint}
                  onChange={(e) => updateComplaint(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Complaint ${index + 1}`}
                />
                {formData.complaints.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeComplaint(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {errors.complaints && (
              <p className="text-red-500 text-sm mb-2">{errors.complaints}</p>
            )}
            <button
              type="button"
              onClick={addComplaint}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + Add Another Complaint
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
  type="button"
  onClick={handleSubmit}
  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
  disabled={loading}
>
  {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Jobcard" : "Create Jobcard")}
</button>
        </div>
      </div>
    </div>
  );
}

export default JobcardForm;
