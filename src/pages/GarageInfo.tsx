import React, { useState, useEffect } from 'react';
import { Save, Edit2, X, Building2 } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

interface GarageFormData {
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
}

interface Address extends GarageFormData {
  id: string;
  status: 'default' | 'not default';
  createdAt: string;
}

export const GarageInfo: React.FC = () => {
  const [formData, setFormData] = useState<GarageFormData>({
    companyName: '',
    gstNumber: '',
    phoneNumber: '',
    fullAddress: '',
    addressLineOne: '',
    addressLineTwo: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    panNumber: '',
  });

  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [isDataSaved, setIsDataSaved] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMessage('');
  };

  const saveToFirebase = async (): Promise<void> => {
    if (!isFormValid()) {
      setErrorMessage('All fields are mandatory. Please fill in all details.');
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, 'garageInfo'));
      
      const addressData = {
        ...formData,
        status: snapshot.empty ? 'default' : 'not default',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'garageInfo'), addressData);
      
      setIsDataSaved(true);
      setIsEditMode(false);
      setSaveMessage('Garage details saved successfully!');
      
      // Clear form after adding new address
      setFormData({
        companyName: '',
        gstNumber: '',
        phoneNumber: '',
        fullAddress: '',
        addressLineOne: '',
        addressLineTwo: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        panNumber: '',
      });
      
      await loadAddresses();
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to save details. Please try again.');
      console.error('Error saving to Firebase:', error);
    }
  };

  const loadAddresses = async (): Promise<void> => {
    try {
      const snapshot = await getDocs(collection(db, 'garageInfo'));
      
      const addressesList: Address[] = snapshot.docs.map(document => ({
        id: document.id,
        ...(document.data() as Omit<Address, 'id'>)
      }));
      
      addressesList.sort((a, b) => {
        if (a.status === 'default') return -1;
        if (b.status === 'default') return 1;
        return 0;
      });
      
      setAddresses(addressesList);
      
      const defaultAddress = addressesList.find(addr => addr.status === 'default');
      if (defaultAddress && !editingAddressId) {
        const { id, status, createdAt, ...addressFormData } = defaultAddress;
        setFormData(addressFormData);
        setIsDataSaved(true);
        setIsEditMode(false);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };

  const makeDefault = async (addressId: string): Promise<void> => {
    try {
      const snapshot = await getDocs(collection(db, 'garageInfo'));
      
      const updatePromises = snapshot.docs.map(document => 
        updateDoc(doc(db, 'garageInfo', document.id), { status: 'not default' })
      );
      
      await Promise.all(updatePromises);
      
      await updateDoc(doc(db, 'garageInfo', addressId), { status: 'default' });
      
      setSaveMessage('Default address updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
      
      await loadAddresses();
    } catch (error) {
      setErrorMessage('Failed to update default address.');
      console.error('Error updating default:', error);
    }
  };

  const deleteAddress = async (addressId: string): Promise<void> => {
    try {
      const addressToDelete = addresses.find(addr => addr.id === addressId);
      
      if (addressToDelete?.status === 'default' && addresses.length > 1) {
        setErrorMessage('Cannot delete default address. Please set another address as default first.');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
      
      await deleteDoc(doc(db, 'garageInfo', addressId));
      
      setSaveMessage('Address deleted successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
      
      await loadAddresses();
    } catch (error) {
      setErrorMessage('Failed to delete address.');
      console.error('Error deleting address:', error);
    }
  };

  const editAddress = (address: Address): void => {
    const { id, status, createdAt, ...addressFormData } = address;
    setFormData(addressFormData);
    setEditingAddressId(id);
    setIsEditMode(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateAddress = async (): Promise<void> => {
    if (!isFormValid()) {
      setErrorMessage('All fields are mandatory. Please fill in all details.');
      return;
    }

    if (!editingAddressId) return;

    try {
      await updateDoc(doc(db, 'garageInfo', editingAddressId), { ...formData });
      
      setIsDataSaved(true);
      setIsEditMode(false);
      setEditingAddressId(null);
      setSaveMessage('Address updated successfully!');
      
      await loadAddresses();
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to update address.');
      console.error('Error updating address:', error);
    }
  };

  const isFormValid = (): boolean => {
    return Object.values(formData).every(value => value.trim() !== '');
  };

  const handleSave = (): void => {
    if (editingAddressId) {
      updateAddress();
    } else {
      saveToFirebase();
    }
  };

  const handleEdit = (): void => {
    setIsEditMode(true);
    setErrorMessage('');
  };

  const handleCancel = (): void => {
    if (editingAddressId) {
      setEditingAddressId(null);
      const defaultAddress = addresses.find(addr => addr.status === 'default');
      if (defaultAddress) {
        const { id, status, createdAt, ...addressFormData } = defaultAddress;
        setFormData(addressFormData);
      }
    }
    setIsEditMode(false);
    setErrorMessage('');
  };

  const handleAddNew = (): void => {
    setFormData({
      companyName: '',
      gstNumber: '',
      phoneNumber: '',
      fullAddress: '',
      addressLineOne: '',
      addressLineTwo: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      panNumber: '',
    });
    setEditingAddressId(null);
    setIsEditMode(true);
    setIsDataSaved(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                  onClick={handleAddNew}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all shadow-md font-semibold"
                >
                  <Save size={20} />
                  Add New Address
                </button>
              )}
              
              {isEditMode && (
                <div className="flex gap-3">
                  {(isDataSaved || editingAddressId) && (
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
                    {editingAddressId ? 'Update Address' : 'Save Address'}
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

            {!isDataSaved && isEditMode && addresses.length === 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Please fill in all your garage details to get started.
              </div>
            )}

            {isEditMode && editingAddressId && (
              <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                You are editing an existing address. Make your changes and click Update.
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

          {/* Saved Addresses List */}
          {addresses.length > 0 && (
            <div className="px-8 pb-8 mt-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Saved Addresses</h2>
              <div className="grid grid-cols-1 gap-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      address.status === 'default'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-lg font-bold text-gray-800">
                            {address.companyName}
                          </h3>
                          {address.status === 'default' && (
                            <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div>
                            <span className="font-semibold">GST:</span> {address.gstNumber}
                          </div>
                          <div>
                            <span className="font-semibold">PAN:</span> {address.panNumber}
                          </div>
                          <div>
                            <span className="font-semibold">Phone:</span> {address.phoneNumber}
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-semibold">Address:</span> {address.fullAddress}
                          </div>
                          <div>
                            <span className="font-semibold">Bank:</span> {address.bankName}
                          </div>
                          <div>
                            <span className="font-semibold">Account:</span> {address.accountNumber}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => editAddress(address)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold"
                        >
                                                    <Edit2 size={16} />
                          Edit
                        </button>

                        {address.status !== 'default' && (
                          <button
                            onClick={() => makeDefault(address.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-semibold"
                          >
                            Make Default
                          </button>
                        )}

                        <button
                          onClick={() => deleteAddress(address.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-semibold"
                        >
                          <X size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default GarageInfo;


// import React, { useState, useEffect } from 'react';
// import { Save, Edit2, X, Building2 } from 'lucide-react';
// import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
// import { db } from '../firebase/firebaseConfig'; 

// export const GarageInfo = () => {
//   const [formData, setFormData] = useState({
//     companyName: '',
//     gstNumber: '',
//     phoneNumber: '',
//     fullAddress: '',
//     addressLineOne: '',
//     addressLineTwo: '',
//     bankName: '',
//     accountNumber: '',
//     ifscCode: '',
//     panNumber: '',
//   });

//   const [isEditMode, setIsEditMode] = useState(true);
//   const [isDataSaved, setIsDataSaved] = useState(false);
//   const [saveMessage, setSaveMessage] = useState('');
//   const [errorMessage, setErrorMessage] = useState('');

//   // Load data from localStorage on mount
//   useEffect(() => {
//     const savedData = localStorage.getItem('garageDetails');
//     if (savedData) {
//       const parsedData = JSON.parse(savedData);
//       setFormData(parsedData);
//       setIsDataSaved(true);
//       setIsEditMode(false);
//     }
//   }, []);

//   const handleInputChange = (e: { target: { name: any; value: any; }; }) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//     setErrorMessage('');
//   };
  

//   const isFormValid = () => {
//     return Object.values(formData).every(value => value.trim() !== '');
//   };

//   const handleSave = () => {
//     if (!isFormValid()) {
//       setErrorMessage('All fields are mandatory. Please fill in all details.');
//       return;
//     }

//     // Save to localStorage (replace with Firebase call later)
//     localStorage.setItem('garageDetails', JSON.stringify(formData));
    
//     setIsDataSaved(true);
//     setIsEditMode(false);
//     setSaveMessage('Garage details saved successfully!');
    
//     setTimeout(() => setSaveMessage(''), 3000);
    
//     console.log('Saved garage details:', formData);
//     // TODO: Add Firebase save logic here
//   };

//   const handleEdit = () => {
//     setIsEditMode(true);
//     setErrorMessage('');
//   };

//   const handleCancel = () => {
//     const savedData = localStorage.getItem('garageDetails');
//     if (savedData) {
//       setFormData(JSON.parse(savedData));
//     }
//     setIsEditMode(false);
//     setErrorMessage('');
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
//       <div className="max-w-5xl mx-auto">
//         <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
//           {/* Header */}
//           <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <Building2 className="text-white" size={32} />
//                 <div>
//                   <h1 className="text-2xl font-bold text-white">Garage Settings</h1>
//                   <p className="text-blue-100 text-sm">Manage your company information</p>
//                 </div>
//               </div>
              
//               {isDataSaved && !isEditMode && (
//                 <button
//                   onClick={handleEdit}
//                   className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all shadow-md font-semibold"
//                 >
//                   <Edit2 size={20} />
//                   Edit Details
//                 </button>
//               )}
              
//               {isEditMode && (
//                 <div className="flex gap-3">
//                   {isDataSaved && (
//                     <button
//                       onClick={handleCancel}
//                       className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow-md font-semibold"
//                     >
//                       <X size={20} />
//                       Cancel
//                     </button>
//                   )}
//                   <button
//                     onClick={handleSave}
//                     disabled={!isFormValid()}
//                     className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all shadow-md font-semibold ${
//                       isFormValid()
//                         ? 'bg-green-600 text-white hover:bg-green-700'
//                         : 'bg-gray-300 text-gray-500 cursor-not-allowed'
//                     }`}
//                   >
//                     <Save size={20} />
//                     Save Details
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Messages */}
//           <div className="px-8 pt-6">
//             {saveMessage && (
//               <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg flex items-center gap-2">
//                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                 </svg>
//                 {saveMessage}
//               </div>
//             )}

//             {errorMessage && (
//               <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg flex items-center gap-2">
//                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                 </svg>
//                 {errorMessage}
//               </div>
//             )}

//             {!isDataSaved && isEditMode && (
//               <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 rounded-lg flex items-center gap-2">
//                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
//                   <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
//                 </svg>
//                 Please fill in all your garage details to get started.
//               </div>
//             )}
//           </div>

//           {/* Form */}
//           <div className="px-8 pb-8">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {/* Company Name */}
//               <div className="md:col-span-2">
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   Company Name <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="companyName"
//                   value={formData.companyName}
//                   onChange={handleInputChange}
//                   placeholder="e.g., SRI VINAYAKA MOTORS"
//                   disabled={!isEditMode}
//                   className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
//                     isEditMode 
//                       ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
//                       : 'border-gray-200 bg-gray-50 cursor-not-allowed'
//                   } outline-none`}
//                 />
//               </div>

//               {/* GST Number */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   GST Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="gstNumber"
//                   value={formData.gstNumber}
//                   onChange={handleInputChange}
//                   placeholder="e.g., 33BGOPB7859R1ZI"
//                   disabled={!isEditMode}
//                   className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
//                     isEditMode 
//                       ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
//                       : 'border-gray-200 bg-gray-50 cursor-not-allowed'
//                   } outline-none`}
//                 />
//               </div>

//               {/* PAN Number */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   PAN Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="panNumber"
//                   value={formData.panNumber}
//                   onChange={handleInputChange}
//                   placeholder="e.g., BGOPB7859R"
//                   disabled={!isEditMode}
//                   className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
//                     isEditMode 
//                       ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
//                       : 'border-gray-200 bg-gray-50 cursor-not-allowed'
//                   } outline-none`}
//                 />
//               </div>

//               {/* Phone Number */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   Phone Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="tel"
//                   name="phoneNumber"
//                   value={formData.phoneNumber}
//                   onChange={handleInputChange}
//                   placeholder="e.g., +91-9940540644"
//                   disabled={!isEditMode}
//                   className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
//                     isEditMode 
//                       ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
//                       : 'border-gray-200 bg-gray-50 cursor-not-allowed'
//                   } outline-none`}
//                 />
//               </div>

//               {/* Full Address */}
//               <div className="md:col-span-2">
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   Full Address <span className="text-red-500">*</span>
//                 </label>
//                 <textarea
//                   name="fullAddress"
//                   value={formData.fullAddress}
//                   onChange={handleInputChange}
//                   placeholder="e.g., #8, English Electrical Nagar, 200 Feet Radial Road, Pallavaram, Chennai 600117"
//                   rows={3}
//                   disabled={!isEditMode}
//                   className={`w-full px-4 py-3 rounded-lg border-2 transition-all resize-none ${
//                     isEditMode 
//                       ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
//                       : 'border-gray-200 bg-gray-50 cursor-not-allowed'
//                   } outline-none`}
//                 />
//               </div>

//               {/* Address Line 1 */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   Address Line 1 <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="addressLineOne"
//                   value={formData.addressLineOne}
//                   onChange={handleInputChange}
//                   placeholder="e.g., #8, English Electrical Nagar"
//                   disabled={!isEditMode}
//                   className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
//                     isEditMode 
//                       ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
//                       : 'border-gray-200 bg-gray-50 cursor-not-allowed'
//                   } outline-none`}
//                 />
//               </div>

//               {/* Address Line 2 */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   Address Line 2 <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="addressLineTwo"
//                   value={formData.addressLineTwo}
//                   onChange={handleInputChange}
//                   placeholder="e.g., Pallavaram, Chennai 600117"
//                   disabled={!isEditMode}
//                   className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
//                     isEditMode 
//                       ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
//                       : 'border-gray-200 bg-gray-50 cursor-not-allowed'
//                   } outline-none`}
//                 />
//               </div>

//               {/* Bank Name */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   Bank Name <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="bankName"
//                   value={formData.bankName}
//                   onChange={handleInputChange}
//                   placeholder="e.g., CANARA BANK"
//                   disabled={!isEditMode}
//                   className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
//                     isEditMode 
//                       ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
//                       : 'border-gray-200 bg-gray-50 cursor-not-allowed'
//                   } outline-none`}
//                 />
//               </div>

//               {/* Account Number */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   Account Number <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="accountNumber"
//                   value={formData.accountNumber}
//                   onChange={handleInputChange}
//                   placeholder="e.g., 1835201002095"
//                   disabled={!isEditMode}
//                   className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
//                     isEditMode 
//                       ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
//                       : 'border-gray-200 bg-gray-50 cursor-not-allowed'
//                   } outline-none`}
//                 />
//               </div>

//               {/* IFSC Code */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   IFSC Code <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="ifscCode"
//                   value={formData.ifscCode}
//                   onChange={handleInputChange}
//                   placeholder="e.g., CNRB0001835"
//                   disabled={!isEditMode}
//                   className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
//                     isEditMode 
//                       ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
//                       : 'border-gray-200 bg-gray-50 cursor-not-allowed'
//                   } outline-none`}
//                 />
//               </div>
//             </div>

//             {/* Footer Note */}
//             <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
//               <p className="text-sm text-blue-800">
//                 <span className="font-semibold">Note:</span> All fields marked with{' '}
//                 <span className="text-red-500 font-bold">*</span> are mandatory. 
//                 This information will be used in your invoices and job cards.
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default GarageInfo;