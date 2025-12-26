import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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

interface InvoiceItem {
  name: string;
  price: number;
  qty: number;
  gst: number;
  amount: number;
  hsn?: string;
}

interface AdditionalCharge {
  description: string;
  amount: number;
}

interface Invoice {
  id?: string;
  invoiceNumber: string;
  date: string;
  invoiceType: 'GST' | 'Non-GST';
  vehicleNumber: string;
  vehicleKilometer: string;
  vehicleMake: string;
  vehicleModel: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerGst?: string;
  stocks: InvoiceItem[];
  services: InvoiceItem[];
  additionalCharges: AdditionalCharge[];
  totalAmount: number;
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
      // Simulate loading - replace with actual Firebase call
      const mockAddresses: GarageAddress[] = [
        {
          id: '1',
          companyName: 'Madhavan Auto Garage',
          gstNumber: '33CKWPG9202L1ZQ',
          phoneNumber: '+91-9444673265',
          fullAddress: 'Plot no 105, Sri Dhanalakshmi Nagar, Amudhum colony, Nandhivaram, Guduvanchery 603202',
          addressLineOne: 'Plot no 105, Sri Dhanalakshmi Nagar, Amudhum colony,',
          addressLineTwo: 'Nandhivaram, Guduvanchery 603202',
          bankName: 'KVB BANK',
          accountNumber: '1657135000007156',
          ifscCode: 'KVBL0001657',
          panNumber: 'CKWPG9202L',
          logoUrl: '',
          status: 'default'
        }
      ];

      setAddresses(mockAddresses);
      setSelectedAddress(mockAddresses[0]);
    } catch (error) {
      console.error('Error loading addresses:', error);
      alert('Error loading garage addresses');
    } finally {
      setLoading(false);
    }
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

    if (num === 0) return 'zero';

    const convertHundreds = (n: number): string => {
      let str = '';
      if (n > 99) {
        str += ones[Math.floor(n / 100)] + ' hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n > 9) {
        str += teens[n - 10] + ' ';
        return str;
      }
      str += ones[n];
      return str;
    };

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;

    let words = '';
    if (crore > 0) words += convertHundreds(crore) + ' crore ';
    if (lakh > 0) words += convertHundreds(lakh) + ' lakh ';
    if (thousand > 0) words += convertHundreds(thousand) + ' thousand ';
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
      // Import jsPDF dynamically
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Header - Company Name
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(selectedAddress.companyName, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;

      // Address Line 1
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedAddress.addressLineOne, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;

      // Address Line 2
      pdf.text(selectedAddress.addressLineTwo, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;

      // Phone
      pdf.text(`Phone: ${selectedAddress.phoneNumber}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;

      // GST Number (if GST invoice)
      if (invoice.invoiceType === 'GST') {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`GSTIN #: ${selectedAddress.gstNumber}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
      } else {
        yPos += 3;
      }

      // Horizontal line
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Customer Section (Left Side)
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Customer', margin, yPos);
      yPos += 6;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Name: ${invoice.customerName}`, margin, yPos);
      yPos += 5;
      pdf.text(`Mobile: ${invoice.customerPhone}`, margin, yPos);
      yPos += 5;
      
      if (invoice.invoiceType === 'GST' && invoice.customerGst) {
        pdf.text(`GST: ${invoice.customerGst}`, margin, yPos);
        yPos += 5;
      }
      
      pdf.text(`Address: ${invoice.customerAddress}`, margin, yPos);

      // Invoice Details (Right Side)
      const rightX = pageWidth / 2 + 10;
      let rightY = yPos - (invoice.invoiceType === 'GST' && invoice.customerGst ? 20 : 15);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Invoice #', rightX, rightY);
      pdf.text('Invoice Date', rightX + 40, rightY);
      rightY += 6;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(invoice.invoiceNumber, rightX, rightY);
      pdf.text(invoice.date, rightX + 40, rightY);

      yPos += 10;

      // Vehicle Details Box
      const boxX = margin;
      const boxY = yPos;
      const boxWidth = pageWidth - 2 * margin;
      const boxHeight = 25;

      pdf.setDrawColor(0);
      pdf.setLineWidth(0.3);
      pdf.rect(boxX, boxY, boxWidth, boxHeight);

      yPos += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      pdf.text(`Vehicle No: ${invoice.vehicleNumber}`, boxX + 3, yPos);
      yPos += 5;
      pdf.text(`Chassis No: ${invoice.vehicleNumber}`, boxX + 3, yPos);
      yPos += 5;
      pdf.text(`Kilometer: ${invoice.vehicleKilometer}`, boxX + 3, yPos);
      yPos += 5;
      pdf.text(`Model: ${invoice.vehicleMake} ${invoice.vehicleModel}`.toUpperCase(), boxX + 3, yPos);
      
      yPos = boxY + boxHeight + 8;

      // Services Section
      if (invoice.services.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('Services', margin, yPos);
        yPos += 5;

        let serviceHeaders: string[];
        let serviceData: any[][];

        if (invoice.invoiceType === 'GST') {
          serviceHeaders = ['Service Name', 'HSN/SAC', 'Rate', 'Qty', 'GST%', 'Total'];
          serviceData = invoice.services.map(item => [
            item.name,
            item.hsn || '998729',
            `Rs. ${item.price.toFixed(2)}`,
            item.qty.toFixed(1),
            `${item.gst.toFixed(1)}%`,
            `Rs. ${item.amount.toFixed(2)}`
          ]);
        } else {
          serviceHeaders = ['Service Name', 'Rate', 'Qty', 'Total'];
          serviceData = invoice.services.map(item => [
            item.name,
            `Rs. ${item.price.toFixed(2)}`,
            item.qty.toString(),
            `Rs. ${item.amount.toFixed(2)}`
          ]);
        }

        autoTable(pdf, {
          startY: yPos,
          head: [serviceHeaders],
          body: serviceData,
          theme: 'grid',
          headStyles: { 
            fillColor: [240, 240, 240], 
            textColor: 0, 
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'left'
          },
          styles: { 
            fontSize: 9, 
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1
          },
          columnStyles: {
            0: { halign: 'left', cellWidth: invoice.invoiceType === 'GST' ? 60 : 90 },
            1: { halign: 'left', cellWidth: invoice.invoiceType === 'GST' ? 25 : 30 },
            2: { halign: 'right', cellWidth: invoice.invoiceType === 'GST' ? 25 : 25 },
            3: { halign: 'center', cellWidth: invoice.invoiceType === 'GST' ? 15 : 25 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'right', cellWidth: 30 }
          },
          margin: { left: margin, right: margin }
        });

        yPos = (pdf as any).lastAutoTable.finalY + 5;

        const serviceTotal = invoice.services.reduce((sum, item) => sum + item.amount, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(`Service Total: Rs. ${serviceTotal.toFixed(2)}`, margin, yPos);
        yPos += 8;
      }

      // Tax Summary (GST invoices only)
      if (invoice.invoiceType === 'GST' && invoice.services.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('Tax Summary', margin, yPos);
        yPos += 5;

        const taxData: any[] = [];
        const allItems = [...invoice.services, ...invoice.stocks];
        
        allItems.forEach(item => {
          const taxableValue = item.price * item.qty;
          const cgstRate = item.gst / 2;
          const cgstAmount = (taxableValue * cgstRate) / 100;
          const sgstAmount = cgstAmount;
          const totalTax = cgstAmount + sgstAmount;

          taxData.push([
            item.hsn || '998729',
            `Rs. ${taxableValue.toFixed(2)}`,
            `${cgstRate.toFixed(1)}%`,
            `Rs. ${cgstAmount.toFixed(2)}`,
            `${cgstRate.toFixed(1)}%`,
            `Rs. ${sgstAmount.toFixed(2)}`,
            `Rs. ${totalTax.toFixed(2)}`
          ]);
        });

        autoTable(pdf, {
          startY: yPos,
          head: [['HSN/SAC', 'Taxable Value', 'CGST%', 'CGST Amt', 'SGST%', 'SGST Amt', 'Total Tax']],
          body: taxData,
          theme: 'grid',
          headStyles: { 
            fillColor: [240, 240, 240], 
            textColor: 0, 
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
          },
          styles: { 
            fontSize: 9, 
            cellPadding: 2,
            halign: 'right',
            lineColor: [200, 200, 200],
            lineWidth: 0.1
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 25 }
          },
          margin: { left: margin, right: margin }
        });

        yPos = (pdf as any).lastAutoTable.finalY + 8;
      }

      // Bill Summary
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Bill Summary', margin, yPos);
      yPos += 6;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const servicesTotal = invoice.services.reduce((s, i) => s + i.amount, 0);
      const productsTotal = invoice.stocks.reduce((s, i) => s + i.amount, 0);

      pdf.text('Services Total:', margin, yPos);
      pdf.text(`Rs. ${servicesTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 5;

      pdf.text('Products Total:', margin, yPos);
      pdf.text(`Rs. ${productsTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 5;

      // Additional charges if any
      if (invoice.additionalCharges.length > 0) {
        invoice.additionalCharges.forEach(charge => {
          pdf.text(charge.description + ':', margin, yPos);
          pdf.text(`Rs. ${charge.amount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
          yPos += 5;
        });
      }

      yPos += 3;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Net Total:', margin, yPos);
      pdf.text(`Rs. ${invoice.totalAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 8;

      // Amount in words
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      const amountWords = numberToWords(Math.floor(invoice.totalAmount));
      pdf.text(`Net Bill Amount in Words: ${amountWords} Rupees Only`, margin, yPos, {
        maxWidth: pageWidth - 2 * margin
      });
      yPos += 12;

      // Bank Details
      pdf.setFont('helvetica', 'bold');
      pdf.text('Bank Details:', margin, yPos);
      yPos += 5;

      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedAddress.bankName, margin, yPos);
      yPos += 5;
      pdf.text(`Account No: ${selectedAddress.accountNumber}`, margin, yPos);
      yPos += 5;
      pdf.text(`IFSC CODE: ${selectedAddress.ifscCode}`, margin, yPos);
      
      if (invoice.invoiceType === 'GST') {
        yPos += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Company PAN: ${selectedAddress.panNumber}`, margin, yPos);
      }

      // Footer - Right aligned
      const footerY = yPos - 15;
      const footerX = pageWidth - margin - 60;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`For ${selectedAddress.companyName}`, footerX, footerY);
      
      pdf.setFontSize(9);
      pdf.text('Computer Generated Invoice', footerX, footerY + 5);
      pdf.text('Signature not Required', footerX, footerY + 9);

      // Save the PDF
      pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating invoice PDF. Please try again.');
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
          <button onClick={onClose} className="text-white hover:opacity-80 transition-opacity">
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
                        {invoice.invoiceType === 'GST' && (
                          <p className="text-sm text-gray-600">GST: {address.gstNumber}</p>
                        )}
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
