import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Save, Edit2, X, Building2 } from 'lucide-react';

export function Settings() {
  const { garageDetails, updateGarageDetails } = useApp();

  const [formData, setFormData] = useState(garageDetails);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDataSaved, setIsDataSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Check if data is already saved on mount
  useEffect(() => {
    const hasData = Object.values(garageDetails).some(value => value.trim() !== '');
    setIsDataSaved(hasData);
    setIsEditMode(!hasData);
    setFormData(garageDetails);
  }, [garageDetails]);

  const handleInputChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMessage('');
  };

  const isFormValid = () => {
    return Object.values(formData).every(value => value.trim() !== '');
  };

  const handleSave = () => {
    if (!isFormValid()) {
      setErrorMessage('All fields are mandatory. Please fill in all details.');
      return;
    }

    updateGarageDetails(formData);
    
    setIsDataSaved(true);
    setIsEditMode(false);
    setSaveMessage('Garage details saved successfully!');
    
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleEdit = () => {
    setIsEditMode(true);
    setErrorMessage('');
  };

  const handleCancel = () => {
    setFormData(garageDetails);
    setIsEditMode(false);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="text-white" size={32} />
                <div>
                  <h1 className="text-2xl font-bold text-white">Garage Settings</h1>
                  <p className="text-blue-100 text-sm">Manage your company information</p>
                </div>
              </div>
              
              {isDataSaved && !isEditMode && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all shadow-md font-semibold"
                >
                  <Edit2 size={20} />
                  Edit Details
                </button>
              )}
              
              {isEditMode && (
                <div className="flex gap-3">
                  {isDataSaved && (
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow-md font-semibold"
                    >
                      <X size={20} />
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={!isFormValid()}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all shadow-md font-semibold ${
                      isFormValid()
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Save size={20} />
                    Save Details
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="px-8 pt-6">
            {saveMessage && (
              <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {saveMessage}
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {errorMessage}
              </div>
            )}

            {!isDataSaved && isEditMode && (
              <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Please fill in all your garage details to get started.
              </div>
            )}
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="e.g., SRI VINAYAKA MOTORS"
                  disabled={!isEditMode}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                    isEditMode 
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  } outline-none`}
                />
              </div>

              {/* GST Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  GST Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 33BGOPB7859R1ZI"
                  disabled={!isEditMode}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                    isEditMode 
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  } outline-none`}
                />
              </div>

              {/* PAN Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  PAN Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., BGOPB7859R"
                  disabled={!isEditMode}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                    isEditMode 
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  } outline-none`}
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., +91-9940540644"
                  disabled={!isEditMode}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                    isEditMode 
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  } outline-none`}
                />
              </div>

              {/* Full Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="fullAddress"
                  value={formData.fullAddress}
                  onChange={handleInputChange}
                  placeholder="e.g., #8, English Electrical Nagar, 200 Feet Radial Road, Pallavaram, Chennai 600117"
                  rows={3}
                  disabled={!isEditMode}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all resize-none ${
                    isEditMode 
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  } outline-none`}
                />
              </div>

              {/* Address Line 1 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="addressLineOne"
                  value={formData.addressLineOne}
                  onChange={handleInputChange}
                  placeholder="e.g., #8, English Electrical Nagar"
                  disabled={!isEditMode}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                    isEditMode 
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  } outline-none`}
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address Line 2 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="addressLineTwo"
                  value={formData.addressLineTwo}
                  onChange={handleInputChange}
                  placeholder="e.g., Pallavaram, Chennai 600117"
                  disabled={!isEditMode}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                    isEditMode 
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  } outline-none`}
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  placeholder="e.g., CANARA BANK"
                  disabled={!isEditMode}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                    isEditMode 
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  } outline-none`}
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 1835201002095"
                  disabled={!isEditMode}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                    isEditMode 
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  } outline-none`}
                />
              </div>

              {/* IFSC Code */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleInputChange}
                  placeholder="e.g., CNRB0001835"
                  disabled={!isEditMode}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                    isEditMode 
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  } outline-none`}
                />
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Note:</span> All fields marked with{' '}
                <span className="text-red-500 font-bold">*</span> are mandatory. 
                This information will be used in your invoices and job cards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}