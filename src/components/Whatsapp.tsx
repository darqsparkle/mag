import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, X, Phone, User, Car, Calendar, FileText, Copy } from 'lucide-react';

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

interface WhatsAppProps {
  jobcard: Jobcard;
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsApp({ jobcard, isOpen, onClose }: WhatsAppProps) {
  const [phoneNumber, setPhoneNumber] = useState(jobcard.mobileNumber);
  const [message, setMessage] = useState('');

  // Generate message based on status
  const generateStatusMessage = (status: string) => {
    const formattedDate = jobcard.dateCreated.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const commonInfo = `📄 *Jobcard Details:*
• Jobcard No: ${jobcard.jobcardNumber}
• Vehicle: ${jobcard.vehicleRegistration} (${jobcard.model})
• Date: ${formattedDate}
• Work Type: ${jobcard.workType}`;

    switch (status) {
      case 'Open':
        return `Hello ${jobcard.customerName}! 👋

Your vehicle has been received for service and is in our queue.

${commonInfo}

🔵 *Status: OPEN*
Your vehicle will be attended to shortly by our skilled technicians.

We'll keep you updated on the progress. Thank you for choosing our service!

Best regards,
Service Team`;

      case 'In Progress':
        return `Hi ${jobcard.customerName}! 🔧

Update on your vehicle service:

${commonInfo}

🟡 *Status: IN PROGRESS*
Our technicians are currently working on your vehicle. We're making good progress and will notify you once the work is completed.

Thank you for your patience!

Service Team`;

      case 'Closed':
        return `Great news ${jobcard.customerName}! ✅

Your vehicle service has been completed successfully.

${commonInfo}

🟢 *Status: COMPLETED*
Your vehicle is ready for pickup!

*Pickup Details:*
• Location: Our Service Center
• Hours: 9:00 AM - 6:00 PM (Mon-Sat)
• Required: This message + Valid ID

Please collect your vehicle at your earliest convenience.

Thank you for trusting us with your vehicle! 🚗✨`;

      default:
        return `Hello ${jobcard.customerName}!

${commonInfo}

Thank you for choosing our service center.`;
    }
  };

  // Update message when status changes
  useEffect(() => {
    if (jobcard) {
      setMessage(generateStatusMessage(jobcard.status));
    }
  }, [jobcard]);

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present
    if (cleaned.startsWith('91')) {
      return cleaned;
    } else if (cleaned.length === 10) {
      return '91' + cleaned;
    }
    return cleaned;
  };

  const sendWhatsAppMessage = () => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    // You could add a toast notification here
  };

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'text-blue-600 bg-blue-50';
      case 'In Progress':
        return 'text-yellow-600 bg-yellow-50';
      case 'Closed':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open':
        return '🔵';
      case 'In Progress':
        return '🟡';
      case 'Closed':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-green-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Send WhatsApp Message</h3>
                <p className="text-sm text-gray-600">{jobcard.jobcardNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Jobcard Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{jobcard.customerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-gray-500" />
              <span>{jobcard.vehicleRegistration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{jobcard.dateCreated.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(jobcard.status)}`}>
                {getStatusIcon(jobcard.status)} {jobcard.status}
              </span>
            </div>
          </div>
        </div>

        {/* Phone Number Input */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number:
          </label>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="+91 9876543210"
            />
          </div>
        </div>

        {/* Message Preview */}
        <div className="flex-1 p-4 overflow-y-auto">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Preview (Auto-generated based on status):
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-64 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
              {message}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Status-based message for: {jobcard.status}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={copyMessage}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button
                onClick={sendWhatsAppMessage}
                disabled={!phoneNumber.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <Send className="w-4 h-4" />
                Send WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

