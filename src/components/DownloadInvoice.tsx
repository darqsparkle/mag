import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Invoice } from '../services/InvoiceService';

interface GarageAddress {
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
  logoUrl: string;
  status: 'default' | 'not default';
}

interface DownloadInvoiceProps {
  invoice: Invoice;
  onClose: () => void;
}

export const DownloadInvoice: React.FC<DownloadInvoiceProps> = ({ invoice, onClose }) => {
  const [addresses, setAddresses] = useState<GarageAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<GarageAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'garageInfo'));
      const addressesList: GarageAddress[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GarageAddress));

      // Sort to show default first
      addressesList.sort((a, b) => {
        if (a.status === 'default') return -1;
        if (b.status === 'default') return 1;
        return 0;
      });

      setAddresses(addressesList);

      // Auto-select default address
      const defaultAddress = addressesList.find(addr => addr.status === 'default');
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      } else if (addressesList.length > 0) {
        setSelectedAddress(addressesList[0]);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      alert('Error loading garage addresses');
    } finally {
      setLoading(false);
    }
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const convertHundreds = (n: number): string => {
      let str = '';
      if (n > 99) {
        str += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n > 9) {
        str += teens[n - 10] + ' ';
        return str;
      }
      str += ones[n] + ' ';
      return str;
    };

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;

    let words = '';
    if (crore > 0) words += convertHundreds(crore) + 'Crore ';
    if (lakh > 0) words += convertHundreds(lakh) + 'Lakh ';
    if (thousand > 0) words += convertHundreds(thousand) + 'Thousand ';
    if (remainder > 0) words += convertHundreds(remainder);

    return words.trim();
  };

  const generatePDF = async () => {
    if (!selectedAddress) {
      alert('Please select a garage address');
      return;
    }

    setDownloading(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Load logo if available
      let logoImage: string | null = null;
      if (selectedAddress.logoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = selectedAddress.logoUrl;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          logoImage = canvas.toDataURL('image/png');
        } catch (error) {
          console.error('Error loading logo:', error);
        }
      }

      // Header Section
      if (logoImage) {
        pdf.addImage(logoImage, 'PNG', margin, yPos, 25, 25);
      }

      // Company Name (Center)
      pdf.setFontSize(15);
      pdf.setFont('helvetica', 'bold');
      const companyNameWidth = pdf.getTextWidth(selectedAddress.companyName);
      pdf.text(selectedAddress.companyName, (pageWidth - companyNameWidth) / 2, yPos + 8);

      // Company Details (Center)
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const addressLine1Width = pdf.getTextWidth(selectedAddress.addressLineOne);
      pdf.text(selectedAddress.addressLineOne, (pageWidth - addressLine1Width) / 2, yPos + 14);

      const addressLine2Width = pdf.getTextWidth(selectedAddress.addressLineTwo);
      pdf.text(selectedAddress.addressLineTwo, (pageWidth - addressLine2Width) / 2, yPos + 19);

      const phoneText = `Phone: ${selectedAddress.phoneNumber}`;
      const phoneWidth = pdf.getTextWidth(phoneText);
      pdf.text(phoneText, (pageWidth - phoneWidth) / 2, yPos + 24);

      if (invoice.invoiceType === 'GST') {
        const gstText = `GSTIN: ${selectedAddress.gstNumber}`;
        pdf.setFont('helvetica', 'bold');
        const gstWidth = pdf.getTextWidth(gstText);
        pdf.text(gstText, (pageWidth - gstWidth) / 2, yPos + 29);
      }

      yPos += 40;

      // Invoice Title
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const titleWidth = pdf.getTextWidth('INVOICE');
      pdf.text('INVOICE', (pageWidth - titleWidth) / 2, yPos);
      yPos += 8;

      // Invoice Details Table
      pdf.setFontSize(12);
      autoTable(pdf, {
        startY: yPos,
        head: [['Invoice #', 'Invoice Date']],
        body: [[invoice.invoiceNumber, invoice.date]],
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontSize: 12 },
        styles: { fontSize: 12, cellPadding: 3 },
        margin: { left: margin, right: pageWidth / 2 + 5 },
      });

      // Vehicle Details Table
      autoTable(pdf, {
        startY: yPos,
        head: [['Vehicle Details', '']],
        body: [
          ['Vehicle No:', invoice.vehicleNumber],
          ['Chassis No:', invoice.vehicleNumber],
          ['Kilometer:', invoice.vehicleKilometer],
          ['Model:', `${invoice.vehicleMake} ${invoice.vehicleModel}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontSize: 12 },
        styles: { fontSize: 12, cellPadding: 3 },
        margin: { left: pageWidth / 2 + 5, right: margin },
      });

      yPos = (pdf as any).lastAutoTable.finalY + 8;

      // Customer Details
      pdf.setFont('helvetica', 'bold');
      pdf.text('Customer', margin, yPos);
      yPos += 5;

      pdf.setFont('helvetica', 'normal');
      pdf.text(`Name: ${invoice.customerName}`, margin, yPos);
      yPos += 5;
      pdf.text(`Mobile: ${invoice.customerPhone}`, margin, yPos);
      yPos += 5;
      if (invoice.invoiceType === 'GST' && invoice.customerGst) {
        pdf.text(`GST: ${invoice.customerGst}`, margin, yPos);
        yPos += 5;
      }
      pdf.text(`Address: ${invoice.customerAddress}`, margin, yPos);
      yPos += 10;

      // Products/Parts Table
      if (invoice.stocks.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Parts/Products', margin, yPos);
        yPos += 5;

        const stockHeaders = invoice.invoiceType === 'GST'
          ? ['Product Name', 'HSN', 'Rate', 'Qty', 'GST%', 'Total']
          : ['Product Name', 'Rate', 'Qty', 'Total'];

        const stockData = invoice.stocks.map(item => {
          const baseData = [
            item.name,
            ...(invoice.invoiceType === 'GST' ? [''] : []),
            `₹${item.price.toFixed(2)}`,
            item.qty.toString(),
            ...(invoice.invoiceType === 'GST' ? [`${item.gst}%`] : []),
            `₹${item.amount.toFixed(2)}`
          ];
          return baseData;
        });

        autoTable(pdf, {
          startY: yPos,
          head: [stockHeaders],
          body: stockData,
          theme: 'grid',
          headStyles: { fillColor: [173, 216, 230], textColor: 0, fontSize: 12, fontStyle: 'bold' },
          styles: { fontSize: 12, cellPadding: 2, halign: 'center' },
          columnStyles: {
            0: { halign: 'left' },
          },
        });

        yPos = (pdf as any).lastAutoTable.finalY + 5;
        const stockTotal = invoice.stocks.reduce((sum, item) => sum + item.amount, 0);
        pdf.text(`Parts Total: ₹${stockTotal.toFixed(2)}`, margin, yPos);
        yPos += 10;
      }

      // Services Table
      if (invoice.services.length > 0) {
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text('Services', margin, yPos);
        yPos += 5;

        const serviceHeaders = invoice.invoiceType === 'GST'
          ? ['Service Name', 'HSN/SAC', 'Rate', 'Qty', 'GST%', 'Total']
          : ['Service Name', 'Rate', 'Qty', 'Total'];

        const serviceData = invoice.services.map(item => {
          const baseData = [
            item.name,
            ...(invoice.invoiceType === 'GST' ? [''] : []),
            `₹${item.price.toFixed(2)}`,
            item.qty.toString(),
            ...(invoice.invoiceType === 'GST' ? [`${item.gst}%`] : []),
            `₹${item.amount.toFixed(2)}`
          ];
          return baseData;
        });

        autoTable(pdf, {
          startY: yPos,
          head: [serviceHeaders],
          body: serviceData,
          theme: 'grid',
          headStyles: { fillColor: [144, 238, 144], textColor: 0, fontSize: 12, fontStyle: 'bold' },
          styles: { fontSize: 12, cellPadding: 2, halign: 'center' },
          columnStyles: {
            0: { halign: 'left' },
          },
        });

        yPos = (pdf as any).lastAutoTable.finalY + 5;
        const serviceTotal = invoice.services.reduce((sum, item) => sum + item.amount, 0);
        pdf.text(`Service Total: ₹${serviceTotal.toFixed(2)}`, margin, yPos);
        yPos += 10;
      }

      // Tax Summary (GST Only)
      if (invoice.invoiceType === 'GST') {
        if (yPos > pageHeight - 80) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text('Tax Summary', margin, yPos);
        yPos += 5;

        const taxDetails: any[] = [];
        [...invoice.stocks, ...invoice.services].forEach(item => {
          const taxableValue = item.price * item.qty;
          const cgstRate = item.gst / 2;
          const cgstAmount = (taxableValue * cgstRate) / 100;
          const sgstAmount = cgstAmount;

          taxDetails.push([
            '',
            `₹${taxableValue.toFixed(2)}`,
            `${cgstRate}%`,
            `₹${cgstAmount.toFixed(2)}`,
            `${cgstRate}%`,
            `₹${sgstAmount.toFixed(2)}`,
            `₹${(cgstAmount + sgstAmount).toFixed(2)}`
          ]);
        });

        autoTable(pdf, {
          startY: yPos,
          head: [['HSN/SAC', 'Taxable Value', 'CGST%', 'CGST Amt', 'SGST%', 'SGST Amt', 'Total Tax']],
          body: taxDetails,
          theme: 'grid',
          headStyles: { fillColor: [200, 200, 200], textColor: 0, fontSize: 12 },
          styles: { fontSize: 12, cellPadding: 2, halign: 'center' },
        });

        yPos = (pdf as any).lastAutoTable.finalY + 10;
      }

      // Bill Summary
      if (yPos > pageHeight - 100) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Bill Summary', margin, yPos);
      yPos += 7;

      pdf.setFont('helvetica', 'normal');
      const summaryData: string[][] = [
        ['Services Total:', `₹${invoice.services.reduce((s, i) => s + i.amount, 0).toFixed(2)}`],
        ['Products Total:', `₹${invoice.stocks.reduce((s, i) => s + i.amount, 0).toFixed(2)}`],
      ];

      if (invoice.additionalCharges.length > 0) {
        summaryData.push(['Additional Charges:', '']);
        invoice.additionalCharges.forEach(charge => {
          summaryData.push([`  • ${charge.description}`, `₹${charge.amount.toFixed(2)}`]);
        });
        const additionalTotal = invoice.additionalCharges.reduce((s, c) => s + c.amount, 0);
        summaryData.push(['Additional Charges Total:', `₹${additionalTotal.toFixed(2)}`]);
      }

      autoTable(pdf, {
        startY: yPos,
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 12, cellPadding: 2 },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'right' },
        },
      });

      yPos = (pdf as any).lastAutoTable.finalY + 5;

      // Net Total
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Net Total:', margin, yPos);
      pdf.text(`₹${invoice.totalAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 8;

      // Amount in Words
      pdf.setFontSize(12);
      const amountInWords = `Net Bill Amount in Words: ${numberToWords(Math.floor(invoice.totalAmount))} Rupees Only`;
      pdf.text(amountInWords, margin, yPos, { maxWidth: pageWidth - 2 * margin });
      yPos += 15;

      // Bank Details and Signature
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.text('Bank Details:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 5;
      pdf.text(selectedAddress.bankName, margin, yPos);
      yPos += 5;
      pdf.text(`Account No: ${selectedAddress.accountNumber}`, margin, yPos);
      yPos += 5;
      pdf.text(`IFSC CODE: ${selectedAddress.ifscCode}`, margin, yPos);
      yPos += 5;
      if (invoice.invoiceType === 'GST') {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Company PAN: ${selectedAddress.panNumber}`, margin, yPos);
      }

      // Signature
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.text(`For ${selectedAddress.companyName}`, pageWidth - margin - 60, yPos - 10);
      pdf.setFontSize(11);
      pdf.text('Computer Generated Invoice', pageWidth - margin - 60, yPos - 5);
      pdf.text('Signature not Required', pageWidth - margin - 60, yPos);

      // Save PDF
      pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating invoice PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-gray-700">Loading addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h3 className="text-xl font-bold text-white">Download Invoice</h3>
          <button onClick={onClose} className="text-white hover:opacity-80">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              Select Garage Address
            </h4>

            {addresses.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No garage addresses found. Please add one in Garage Settings.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    onClick={() => setSelectedAddress(address)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAddress?.id === address.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {address.logoUrl && (
                        <img
                          src={address.logoUrl}
                          alt={`${address.companyName} logo`}
                          className="w-12 h-12 object-contain border border-gray-200 rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-bold text-gray-800">
                            {address.companyName}
                          </h5>
                          {address.status === 'default' && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{address.fullAddress}</p>
                        <p className="text-sm text-gray-600">Phone: {address.phoneNumber}</p>
                        <p className="text-sm text-gray-600">GST: {address.gstNumber}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={generatePDF}
              disabled={!selectedAddress || downloading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? 'Generating...' : 'Download Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};