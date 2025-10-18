import React, { useEffect, useRef, useState } from "react";
import { X, Download, Printer, Building2 } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const Constants = {
  companyName: "SRI VINAYAKA MOTORS",
  forCompanyName: "From Sri Vinayaka Motors",
  jobCardRepairOrders: "Sri Vinayaka Motors REPAIR ORDERS",
  gstNumber: "GSTIN #: 33BGOPB7859R1ZI",
  phoneNumber: "Phone: +91-9940540644",
  fullAddress:
    "#8, English Electrical Nagar,200 Feet Radial Road, Pallavaram, Chennai 600117",
  addressLineOne: "#8, English Electrical Nagar,200 Feet Radial Road, ",
  addressLineTwo: "Pallavaram, Chennai 600117,",
  bankName: "CANARA BANK",
  accountNumber: "Account No: 1835201002095",
  ifscCode: "IFSC CODE: CNRB0001835",
  panNumber: "Company PAN: BGOPB7859R",
};

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

interface DownloadJobcardProps {
  jobcard: Jobcard;
  isOpen: boolean;
  onClose: () => void;
}
interface Address {
  id: string;
  companyName: string;
  gstNumber: string;
  phoneNumber: string;
  fullAddress: string;
  addressLineOne: string;
  addressLineTwo: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  panNumber: string;
  status: "default" | "not default";
}

const DownloadJobcard: React.FC<DownloadJobcardProps> = ({
  jobcard,
  isOpen,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // state variables

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);

  if (!isOpen) return null;

  const formatDateTime = (date: Date) => {
    return (
      date.toLocaleDateString("en-IN") +
      " " +
      date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  useEffect(() => {
    if (isOpen) {
      loadAddresses();
    }
  }, [isOpen]);
  const loadAddresses = async () => {
  try {
    const snapshot = await getDocs(collection(db, "garageInfo"));

    const addressesList: Address[] = snapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<Address, "id">),
    }));

    setAddresses(addressesList);

    const defaultAddress = addressesList.find(
      (addr) => addr.status === "default"
    );
    
    if (defaultAddress) {
      setSelectedAddress(defaultAddress);
    } else if (addressesList.length > 0) {
      setSelectedAddress(addressesList[0]);
    }
    
    // ✅ Auto-confirm if only one address exists
    if (addressesList.length === 1) {
      setIsAddressConfirmed(true);
    }
  } catch (error) {
    console.error("Error loading addresses:", error);
  }
};

  // Handle address selection
  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    setShowAddressSelector(false);
  };
  const handleDownload = () => {
    if (printRef.current) {
      const printContent = printRef.current;
      const originalDisplay = printContent.style.display;

      // Create a new window for printing
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Job Card - ${jobcard.jobcardNumber}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.3; }
                .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm; background: white; }
                .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                .company-details { font-size: 11px; margin-bottom: 3px; }
                .section { border: 1px solid #000; margin-bottom: 10px; }
                .section-header { background-color: #f0f0f0; padding: 5px; font-weight: bold; border-bottom: 1px solid #000; }
                .three-column { display: flex; }
                .column { flex: 1; padding: 8px; border-right: 1px solid #000; }
                .column:last-child { border-right: none; }
                .field-row { margin-bottom: 5px; display: flex; align-items: center; }
                .field-label { font-weight: bold; min-width: 80px; margin-right: 5px; }
                .field-value { flex: 1; }
                .underline { border-bottom: 1px solid #000; min-height: 16px; }
                .complaints-section { display: flex; min-height: 200px; }
                .complaints-column { flex: 0.6; padding: 8px; border-right: 1px solid #000; }
                .jobs-column { flex: 0.4; padding: 8px; }
                .service-details { padding: 8px; }
                .service-row { display: flex; margin-bottom: 10px; }
                .service-col { flex: 1; margin-right: 15px; }
                .checkbox-row { margin-bottom: 5px; }
                .fuel-level { margin-bottom: 8px; }
                .terms { font-size: 10px; margin: 10px 0; }
                .signature-section { display: flex; justify-content: space-between; padding: 8px; }
                .signature-box { flex: 1; margin: 0 10px; }
                .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
                .table th { background-color: #f0f0f0; font-weight: bold; }
                .disclaimer { text-align: center; color: red; font-weight: bold; margin-top: 15px; }
                @media print {
                  .no-print { display: none !important; }
                  .page { margin: 0; padding: 5mm; }
                  body { print-color-adjust: exact; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);

        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
        };
      }
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        {/* Header */}
<div className="flex items-center justify-between p-4 border-b no-print">
  <h2 className="text-xl font-bold text-gray-900">Job Card Preview</h2>
  
  <div className="flex items-center gap-3">
    {/* Step 1: Address Selection (shown first) */}
    {!isAddressConfirmed && (
      <div className="flex items-center gap-2">
        {addresses.length > 0 && (
          <>
            {/* Address Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAddressSelector(!showAddressSelector)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-2 border-blue-500 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
              >
                <Building2 className="w-4 h-4" />
                {selectedAddress?.companyName || "Select Address"}
              </button>

              {/* Dropdown Menu */}
              {showAddressSelector && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border-2 border-gray-200 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-2 bg-gray-50 border-b sticky top-0">
                    <p className="text-xs font-semibold text-gray-600">
                      Select Address for Job Card
                    </p>
                  </div>
                  {addresses.map((address) => (
                    <button
                      key={address.id}
                      onClick={() => handleAddressSelect(address)}
                      className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b last:border-b-0 ${
                        selectedAddress?.id === address.id
                          ? "bg-blue-100 border-l-4 border-l-blue-600"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {address.companyName}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {address.fullAddress}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            GST: {address.gstNumber}
                          </div>
                        </div>
                        {address.status === "default" && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                            DEFAULT
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Button */}
            <button
              onClick={() => setIsAddressConfirmed(true)}
              disabled={!selectedAddress}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Address
            </button>
          </>
        )}
      </div>
    )}

    {/* Step 2: Download Button (shown after confirmation) */}
    {isAddressConfirmed && (
      <>
        {/* Selected Address Display */}
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-500 rounded-lg">
          <Building2 className="w-4 h-4 text-green-600" />
          <div>
            <div className="text-sm font-semibold text-green-800">
              {selectedAddress?.companyName}
            </div>
            <div className="text-xs text-green-600">
              Address confirmed
            </div>
          </div>
        </div>

        {/* Change Address Button */}
        <button
          onClick={() => setIsAddressConfirmed(false)}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Change
        </button>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold shadow-lg"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </>
    )}

    {/* Close Button */}
    <button
      onClick={onClose}
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
</div>

        {/* PDF Content */}
        <div className="overflow-auto flex-1">
          <div ref={printRef} className="page">
            {/* Page 1 */}
            <div className="page-content">
              {/* Header */}
              <div className="header">
                <div className="company-name">
                  {selectedAddress?.companyName ||
                    Constants.jobCardRepairOrders}
                </div>
                <div className="company-details">
                  {selectedAddress?.fullAddress || Constants.fullAddress}
                </div>
                <div className="company-details">
                  {selectedAddress?.phoneNumber || Constants.phoneNumber}
                </div>
                <div className="company-details">
                  GSTIN #: {selectedAddress?.gstNumber || Constants.gstNumber}
                </div>
              </div>

              {/* Three Column Section */}
              <div className="section">
                <div className="three-column">
                  {/* Customer Details */}
                  <div className="column">
                    <div className="section-header">Customer Details</div>
                    <div className="field-row">
                      <span className="field-label">Name:</span>
                      <span className="field-value">
                        {jobcard.customerName}
                      </span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">GST:</span>
                      <span className="field-value">
                        {jobcard.gstNumber || "N/A"}
                      </span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Address:</span>
                      <span className="field-value">{jobcard.address}</span>
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="column">
                    <div className="section-header">Vehicle Details</div>
                    <div className="field-row">
                      <span className="field-label">Registration:</span>
                      <span className="field-value">
                        {jobcard.vehicleRegistration}
                      </span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Make/Model:</span>
                      <span className="field-value">{jobcard.model}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Kilometer:</span>
                      <span className="field-value">{jobcard.kilometer}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Engine Number:</span>
                      <div className="underline"></div>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Chassis Number:</span>
                      <div className="underline"></div>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="column">
                    <div className="section-header">Job Details</div>
                    <div className="field-row">
                      <span className="field-label">Work Type:</span>
                      <span className="field-value">{jobcard.workType}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Job Card Date:</span>
                      <span className="field-value">
                        {formatDateTime(jobcard.dateCreated)}
                      </span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Job Number:</span>
                      <span className="field-value">
                        {jobcard.jobcardNumber}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Request and Jobs Section */}
              <div className="section">
                <div className="complaints-section">
                  <div className="complaints-column">
                    <div className="section-header">Customer's Request</div>
                    {Array.from({ length: 10 }, (_, index) => (
                      <div key={index} className="field-row">
                        <span style={{ minWidth: "20px" }}>{index + 1}.</span>
                        <span className="field-value">
                          {index < jobcard.complaints.length
                            ? jobcard.complaints[index]
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="jobs-column">
                    <div className="section-header">Jobs to be Carried Out</div>
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                        Primary Job
                      </div>
                      <div
                        className="underline"
                        style={{ marginBottom: "5px" }}
                      ></div>
                      <div className="underline"></div>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                        Secondary Job
                      </div>
                      <div
                        className="underline"
                        style={{ marginBottom: "5px" }}
                      ></div>
                      <div className="underline"></div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                        Additional Job
                      </div>
                      <div
                        className="underline"
                        style={{ marginBottom: "5px" }}
                      ></div>
                      <div className="underline"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Details Section */}
              <div className="section">
                <div className="service-details">
                  <div className="section-header">Service Details</div>
                  <div className="service-row">
                    <div className="service-col">
                      <div className="field-row">
                        <span className="field-label">Promise Date:</span>
                        <div className="underline"></div>
                      </div>
                      <div className="field-row">
                        <span className="field-label">Delivery Time:</span>
                        <div className="underline"></div>
                      </div>
                      <div className="field-row">
                        <span className="field-label">
                          Service Advisor Name:
                        </span>
                        <div className="underline"></div>
                      </div>
                      <div className="field-row">
                        <span className="field-label">
                          Service Advisor Number:
                        </span>
                        <div className="underline"></div>
                      </div>
                    </div>
                    <div className="service-col">
                      <div className="fuel-level">
                        <span style={{ fontWeight: "bold" }}>Fuel Level: </span>
                        <span>E---|---|---F</span>
                      </div>
                      <div className="checkbox-row">Remote: ☐Yes ☐No</div>
                      <div className="checkbox-row">Tool Kit: ☐Yes ☐No</div>
                      <div className="checkbox-row">Spare Wheel: ☐Yes ☐No</div>
                      <div className="checkbox-row">Jack Handle: ☐Yes ☐No</div>
                    </div>
                    <div className="service-col">
                      <div className="checkbox-row">Car Perfume: ☐Yes ☐No</div>
                      <div className="checkbox-row">Stereo: ☐Yes ☐No</div>
                      <div className="checkbox-row">Mirror: ☐Yes ☐No</div>
                      <div className="checkbox-row">Wheel Cap: ☐Yes ☐No</div>
                      <div className="field-row">
                        <span className="field-label">Speaker Front:</span>
                        <div className="underline"></div>
                      </div>
                      <div className="field-row">
                        <span className="field-label">Speaker Rear:</span>
                        <div className="underline"></div>
                      </div>
                    </div>
                  </div>
                  <div className="terms">
                    <strong>Terms and Conditions:</strong>
                    <br />I hereby authorise for the above repairing to be
                    executed using necessary materials and I affixing my
                    signature to the terms and conditions by our organisation
                    absolutely and unconditionally.
                  </div>
                  <div className="field-row">
                    <span className="field-label">Customer Signature:</span>
                    <div className="underline"></div>
                  </div>
                </div>
              </div>

              {/* Delivery and Final Inspection */}
              <div className="section">
                <div className="signature-section">
                  <div className="signature-box">
                    <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
                      Delivery By
                    </div>
                    <div className="field-row">
                      <span className="field-label">Name:</span>
                      <div className="underline"></div>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Time and Date:</span>
                      <div className="underline"></div>
                    </div>
                  </div>
                  <div className="signature-box">
                    <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
                      Final Inspection
                    </div>
                    <div className="field-row">
                      <span className="field-label">Name:</span>
                      <div className="underline"></div>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Time and Date:</span>
                      <div className="underline"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Page 2 */}
            <div style={{ pageBreakBefore: "always", paddingTop: "20px" }}>
              {/* Customer Details Summary */}
              <div className="section">
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "14px",
                    marginBottom: "10px",
                  }}
                >
                  Customer Details
                </div>
                <div style={{ padding: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "5px",
                    }}
                  >
                    <span>
                      Registration Number: {jobcard.vehicleRegistration}
                    </span>
                    <span>Customer Name: {jobcard.customerName}</span>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Kilometer: {jobcard.kilometer}</span>
                    <span>Work Type: {jobcard.workType}</span>
                  </div>
                </div>
              </div>

              {/* Signature Section */}
              <div className="section">
                <div className="signature-section">
                  <div className="signature-box">
                    <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
                      Service Provider
                    </div>
                    <div className="field-row">
                      <span className="field-label">Executive Name:</span>
                      <div className="underline"></div>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Signature:</span>
                      <div className="underline"></div>
                    </div>
                  </div>
                  <div className="signature-box">
                    <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
                      Customer Approval Signature
                    </div>
                    <div className="field-row">
                      <span className="field-label">Signature:</span>
                      <div className="underline"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services Table */}
              <div className="section">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "8%" }}>Sno.</th>
                      <th style={{ width: "35%" }}>Description</th>
                      <th style={{ width: "30%" }}>Work Done</th>
                      <th style={{ width: "13%" }}>Material Cost</th>
                      <th style={{ width: "14%" }}>Labour Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 25 }, (_, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Disclaimer */}
              <div className="disclaimer">
                Above information is not an invoice and only an estimation of
                service describe above. The estimation is non-contractual.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadJobcard;

// import React, { useEffect, useRef, useState } from "react";
// import { X, Download, Printer, Building2 } from "lucide-react";
// import { collection, getDocs } from "firebase/firestore";
// import { db } from "../firebase/firebaseConfig";

// const Constants = {
//   companyName: "SRI VINAYAKA MOTORS",
//   forCompanyName: "From Sri Vinayaka Motors",
//   jobCardRepairOrders: "Sri Vinayaka Motors REPAIR ORDERS",
//   gstNumber: "GSTIN #: 33BGOPB7859R1ZI",
//   phoneNumber: "Phone: +91-9940540644",
//   fullAddress:
//     "#8, English Electrical Nagar,200 Feet Radial Road, Pallavaram, Chennai 600117",
//   addressLineOne: "#8, English Electrical Nagar,200 Feet Radial Road, ",
//   addressLineTwo: "Pallavaram, Chennai 600117,",
//   bankName: "CANARA BANK",
//   accountNumber: "Account No: 1835201002095",
//   ifscCode: "IFSC CODE: CNRB0001835",
//   panNumber: "Company PAN: BGOPB7859R",
// };

// interface Jobcard {
//   id: string;
//   jobcardNumber: string;
//   dateCreated: Date;
//   vehicleRegistration: string;
//   customerName: string;
//   mobileNumber: string;
//   gstNumber?: string;
//   address?: string;
//   chassisNumber?: string;
//   kilometer: string;
//   model: string;
//   workType: "General Service" | "Running Repair" | "Body Shop";
//   complaints: string[];
//   status: "Open" | "In Progress" | "Closed";
// }

// interface DownloadJobcardProps {
//   jobcard: Jobcard;
//   isOpen: boolean;
//   onClose: () => void;
// }
// interface Address {
//   id: string;
//   companyName: string;
//   gstNumber: string;
//   phoneNumber: string;
//   fullAddress: string;
//   addressLineOne: string;
//   addressLineTwo: string;
//   bankName: string;
//   accountNumber: string;
//   ifscCode: string;
//   panNumber: string;
//   status: "default" | "not default";
// }

// const DownloadJobcard: React.FC<DownloadJobcardProps> = ({
//   jobcard,
//   isOpen,
//   onClose,
// }) => {
//   const printRef = useRef<HTMLDivElement>(null);

//   const [addresses, setAddresses] = useState<Address[]>([]);
// const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
// const [showAddressSelector, setShowAddressSelector] = useState(false);

//   if (!isOpen) return null;

//   const formatDateTime = (date: Date) => {
//     return (
//       date.toLocaleDateString("en-IN") +
//       " " +
//       date.toLocaleTimeString("en-IN", {
//         hour: "2-digit",
//         minute: "2-digit",
//       })
//     );
//   };

//   useEffect(() => {
//     if (isOpen) {
//       loadAddresses();
//     }
//   }, [isOpen]);
//   const loadAddresses = async () => {
//     try {
//       const snapshot = await getDocs(collection(db, "garageInfo"));

//       const addressesList: Address[] = snapshot.docs.map((document) => ({
//         id: document.id,
//         ...(document.data() as Omit<Address, "id">),
//       }));

//       setAddresses(addressesList);

//       // Set default address as selected
//       const defaultAddress = addressesList.find(
//         (addr) => addr.status === "default"
//       );
//       if (defaultAddress) {
//         setSelectedAddress(defaultAddress);
//       } else if (addressesList.length > 0) {
//         // If no default, select first address
//         setSelectedAddress(addressesList[0]);
//       }
//     } catch (error) {
//       console.error("Error loading addresses:", error);
//     }
//   };

//   // Handle address selection
//   const handleAddressSelect = (address: Address) => {
//     setSelectedAddress(address);
//     setShowAddressSelector(false);
//   };
//   const handleDownload = () => {
//     if (printRef.current) {
//       const printContent = printRef.current;
//       const originalDisplay = printContent.style.display;

//       // Create a new window for printing
//       const printWindow = window.open("", "_blank");
//       if (printWindow) {
//         printWindow.document.write(`
//           <!DOCTYPE html>
//           <html>
//             <head>
//               <title>Job Card - ${jobcard.jobcardNumber}</title>
//               <style>
//                 * { margin: 0; padding: 0; box-sizing: border-box; }
//                 body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.3; }
//                 .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm; background: white; }
//                 .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
//                 .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
//                 .company-details { font-size: 11px; margin-bottom: 3px; }
//                 .section { border: 1px solid #000; margin-bottom: 10px; }
//                 .section-header { background-color: #f0f0f0; padding: 5px; font-weight: bold; border-bottom: 1px solid #000; }
//                 .three-column { display: flex; }
//                 .column { flex: 1; padding: 8px; border-right: 1px solid #000; }
//                 .column:last-child { border-right: none; }
//                 .field-row { margin-bottom: 5px; display: flex; align-items: center; }
//                 .field-label { font-weight: bold; min-width: 80px; margin-right: 5px; }
//                 .field-value { flex: 1; }
//                 .underline { border-bottom: 1px solid #000; min-height: 16px; }
//                 .complaints-section { display: flex; min-height: 200px; }
//                 .complaints-column { flex: 0.6; padding: 8px; border-right: 1px solid #000; }
//                 .jobs-column { flex: 0.4; padding: 8px; }
//                 .service-details { padding: 8px; }
//                 .service-row { display: flex; margin-bottom: 10px; }
//                 .service-col { flex: 1; margin-right: 15px; }
//                 .checkbox-row { margin-bottom: 5px; }
//                 .fuel-level { margin-bottom: 8px; }
//                 .terms { font-size: 10px; margin: 10px 0; }
//                 .signature-section { display: flex; justify-content: space-between; padding: 8px; }
//                 .signature-box { flex: 1; margin: 0 10px; }
//                 .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
//                 .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
//                 .table th { background-color: #f0f0f0; font-weight: bold; }
//                 .disclaimer { text-align: center; color: red; font-weight: bold; margin-top: 15px; }
//                 @media print {
//                   .no-print { display: none !important; }
//                   .page { margin: 0; padding: 5mm; }
//                   body { print-color-adjust: exact; }
//                 }
//               </style>
//             </head>
//             <body>
//               ${printContent.innerHTML}
//             </body>
//           </html>
//         `);

//         printWindow.document.close();
//         printWindow.onload = () => {
//           printWindow.print();
//           printWindow.close();
//         };
//       }
//     }
//   };

//   const handlePrint = () => {
//     if (printRef.current) {
//       window.print();
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
//       <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
//         {/* Header */}
//         <div className="flex items-center justify-between p-4 border-b no-print">
//           <h2 className="text-xl font-bold text-gray-900">Job Card Preview</h2>
//           <div className="flex items-center gap-2">
//             <button
//               onClick={handleDownload}
//               className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
//             >
//               <Download className="w-4 h-4" />
//               Download PDF
//             </button>
//             {/* Address Selector Button */}
//             {addresses.length > 1 && (
//               <button
//                 onClick={() => setShowAddressSelector(!showAddressSelector)}
//                 className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors relative"
//               >
//                 <Building2 className="w-4 h-4" />
//                 {selectedAddress?.companyName || "Select Address"}

//                 {/* Dropdown */}
//                 {showAddressSelector && (
//                   <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
//                     {addresses.map((address) => (
//                       <button
//                         key={address.id}
//                         onClick={() => handleAddressSelect(address)}
//                         className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 ${
//                           selectedAddress?.id === address.id
//                             ? "bg-blue-50 text-blue-700"
//                             : ""
//                         }`}
//                       >
//                         <div className="font-semibold">
//                           {address.companyName}
//                         </div>
//                         <div className="text-xs text-gray-500 truncate">
//                           {address.fullAddress}
//                         </div>
//                         {address.status === "default" && (
//                           <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded mt-1 inline-block">
//                             DEFAULT
//                           </span>
//                         )}
//                       </button>
//                     ))}
//                   </div>
//                 )}
//               </button>
//             )}
//             <button
//               onClick={onClose}
//               className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//             >
//               <X className="w-5 h-5" />
//             </button>
//           </div>
//         </div>

//         {/* PDF Content */}
//         <div className="overflow-auto flex-1">
//           <div ref={printRef} className="page">
//             {/* Page 1 */}
//             <div className="page-content">
//               {/* Header */}
//               <div className="header">
//                 <div className="company-name">
//                   {selectedAddress?.companyName ||
//                     Constants.jobCardRepairOrders}
//                 </div>
//                 <div className="company-details">
//                   {selectedAddress?.fullAddress || Constants.fullAddress}
//                 </div>
//                 <div className="company-details">
//                   {selectedAddress?.phoneNumber || Constants.phoneNumber}
//                 </div>
//                 <div className="company-details">
//                   GSTIN #: {selectedAddress?.gstNumber || Constants.gstNumber}
//                 </div>
//               </div>

//               {/* Three Column Section */}
//               <div className="section">
//                 <div className="three-column">
//                   {/* Customer Details */}
//                   <div className="column">
//                     <div className="section-header">Customer Details</div>
//                     <div className="field-row">
//                       <span className="field-label">Name:</span>
//                       <span className="field-value">
//                         {jobcard.customerName}
//                       </span>
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">GST:</span>
//                       <span className="field-value">
//                         {jobcard.gstNumber || "N/A"}
//                       </span>
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Address:</span>
//                       <span className="field-value">{jobcard.address}</span>
//                     </div>
//                   </div>

//                   {/* Vehicle Details */}
//                   <div className="column">
//                     <div className="section-header">Vehicle Details</div>
//                     <div className="field-row">
//                       <span className="field-label">Registration:</span>
//                       <span className="field-value">
//                         {jobcard.vehicleRegistration}
//                       </span>
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Make/Model:</span>
//                       <span className="field-value">{jobcard.model}</span>
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Kilometer:</span>
//                       <span className="field-value">{jobcard.kilometer}</span>
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Engine Number:</span>
//                       <div className="underline"></div>
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Chassis Number:</span>
//                       <div className="underline"></div>
//                     </div>
//                   </div>

//                   {/* Job Details */}
//                   <div className="column">
//                     <div className="section-header">Job Details</div>
//                     <div className="field-row">
//                       <span className="field-label">Work Type:</span>
//                       <span className="field-value">{jobcard.workType}</span>
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Job Card Date:</span>
//                       <span className="field-value">
//                         {formatDateTime(jobcard.dateCreated)}
//                       </span>
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Job Number:</span>
//                       <span className="field-value">
//                         {jobcard.jobcardNumber}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Customer Request and Jobs Section */}
//               <div className="section">
//                 <div className="complaints-section">
//                   <div className="complaints-column">
//                     <div className="section-header">Customer's Request</div>
//                     {Array.from({ length: 10 }, (_, index) => (
//                       <div key={index} className="field-row">
//                         <span style={{ minWidth: "20px" }}>{index + 1}.</span>
//                         <span className="field-value">
//                           {index < jobcard.complaints.length
//                             ? jobcard.complaints[index]
//                             : ""}
//                         </span>
//                       </div>
//                     ))}
//                   </div>
//                   <div className="jobs-column">
//                     <div className="section-header">Jobs to be Carried Out</div>
//                     <div style={{ marginBottom: "10px" }}>
//                       <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
//                         Primary Job
//                       </div>
//                       <div
//                         className="underline"
//                         style={{ marginBottom: "5px" }}
//                       ></div>
//                       <div className="underline"></div>
//                     </div>
//                     <div style={{ marginBottom: "10px" }}>
//                       <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
//                         Secondary Job
//                       </div>
//                       <div
//                         className="underline"
//                         style={{ marginBottom: "5px" }}
//                       ></div>
//                       <div className="underline"></div>
//                     </div>
//                     <div>
//                       <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
//                         Additional Job
//                       </div>
//                       <div
//                         className="underline"
//                         style={{ marginBottom: "5px" }}
//                       ></div>
//                       <div className="underline"></div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Service Details Section */}
//               <div className="section">
//                 <div className="service-details">
//                   <div className="section-header">Service Details</div>
//                   <div className="service-row">
//                     <div className="service-col">
//                       <div className="field-row">
//                         <span className="field-label">Promise Date:</span>
//                         <div className="underline"></div>
//                       </div>
//                       <div className="field-row">
//                         <span className="field-label">Delivery Time:</span>
//                         <div className="underline"></div>
//                       </div>
//                       <div className="field-row">
//                         <span className="field-label">
//                           Service Advisor Name:
//                         </span>
//                         <div className="underline"></div>
//                       </div>
//                       <div className="field-row">
//                         <span className="field-label">
//                           Service Advisor Number:
//                         </span>
//                         <div className="underline"></div>
//                       </div>
//                     </div>
//                     <div className="service-col">
//                       <div className="fuel-level">
//                         <span style={{ fontWeight: "bold" }}>Fuel Level: </span>
//                         <span>E---|---|---F</span>
//                       </div>
//                       <div className="checkbox-row">Remote: ☐Yes ☐No</div>
//                       <div className="checkbox-row">Tool Kit: ☐Yes ☐No</div>
//                       <div className="checkbox-row">Spare Wheel: ☐Yes ☐No</div>
//                       <div className="checkbox-row">Jack Handle: ☐Yes ☐No</div>
//                     </div>
//                     <div className="service-col">
//                       <div className="checkbox-row">Car Perfume: ☐Yes ☐No</div>
//                       <div className="checkbox-row">Stereo: ☐Yes ☐No</div>
//                       <div className="checkbox-row">Mirror: ☐Yes ☐No</div>
//                       <div className="checkbox-row">Wheel Cap: ☐Yes ☐No</div>
//                       <div className="field-row">
//                         <span className="field-label">Speaker Front:</span>
//                         <div className="underline"></div>
//                       </div>
//                       <div className="field-row">
//                         <span className="field-label">Speaker Rear:</span>
//                         <div className="underline"></div>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="terms">
//                     <strong>Terms and Conditions:</strong>
//                     <br />I hereby authorise for the above repairing to be
//                     executed using necessary materials and I affixing my
//                     signature to the terms and conditions by our organisation
//                     absolutely and unconditionally.
//                   </div>
//                   <div className="field-row">
//                     <span className="field-label">Customer Signature:</span>
//                     <div className="underline"></div>
//                   </div>
//                 </div>
//               </div>

//               {/* Delivery and Final Inspection */}
//               <div className="section">
//                 <div className="signature-section">
//                   <div className="signature-box">
//                     <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
//                       Delivery By
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Name:</span>
//                       <div className="underline"></div>
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Time and Date:</span>
//                       <div className="underline"></div>
//                     </div>
//                   </div>
//                   <div className="signature-box">
//                     <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
//                       Final Inspection
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Name:</span>
//                       <div className="underline"></div>
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Time and Date:</span>
//                       <div className="underline"></div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Page 2 */}
//             <div style={{ pageBreakBefore: "always", paddingTop: "20px" }}>
//               {/* Customer Details Summary */}
//               <div className="section">
//                 <div
//                   style={{
//                     textAlign: "center",
//                     fontWeight: "bold",
//                     fontSize: "14px",
//                     marginBottom: "10px",
//                   }}
//                 >
//                   Customer Details
//                 </div>
//                 <div style={{ padding: "10px" }}>
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       marginBottom: "5px",
//                     }}
//                   >
//                     <span>
//                       Registration Number: {jobcard.vehicleRegistration}
//                     </span>
//                     <span>Customer Name: {jobcard.customerName}</span>
//                   </div>
//                   <div
//                     style={{ display: "flex", justifyContent: "space-between" }}
//                   >
//                     <span>Kilometer: {jobcard.kilometer}</span>
//                     <span>Work Type: {jobcard.workType}</span>
//                   </div>
//                 </div>
//               </div>

//               {/* Signature Section */}
//               <div className="section">
//                 <div className="signature-section">
//                   <div className="signature-box">
//                     <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
//                       Service Provider
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Executive Name:</span>
//                       <div className="underline"></div>
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Signature:</span>
//                       <div className="underline"></div>
//                     </div>
//                   </div>
//                   <div className="signature-box">
//                     <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
//                       Customer Approval Signature
//                     </div>
//                     <div className="field-row">
//                       <span className="field-label">Signature:</span>
//                       <div className="underline"></div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Services Table */}
//               <div className="section">
//                 <table className="table">
//                   <thead>
//                     <tr>
//                       <th style={{ width: "8%" }}>Sno.</th>
//                       <th style={{ width: "35%" }}>Description</th>
//                       <th style={{ width: "30%" }}>Work Done</th>
//                       <th style={{ width: "13%" }}>Material Cost</th>
//                       <th style={{ width: "14%" }}>Labour Cost</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {Array.from({ length: 25 }, (_, index) => (
//                       <tr key={index}>
//                         <td>{index + 1}</td>
//                         <td></td>
//                         <td></td>
//                         <td></td>
//                         <td></td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//               {/* Disclaimer */}
//               <div className="disclaimer">
//                 Above information is not an invoice and only an estimation of
//                 service describe above. The estimation is non-contractual.
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DownloadJobcard;
