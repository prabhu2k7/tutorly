import { Trash2, CheckCircle } from 'lucide-react'

function DeleteDialog({ isOpen, filename, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all animate-scaleIn">
        <div className="flex flex-col items-center text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle className="w-12 h-12 text-red-600" />
          </div>
          
          {/* Success Message */}
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            Document Deleted!
          </h2>
          
          <p className="text-gray-600 mb-2">
            The document has been successfully deleted from your collection.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full mt-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Deleted Document:</p>
            <p className="text-lg font-semibold text-red-700 break-words">
              {filename}
            </p>
          </div>
          
          {/* OK Button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
          >
            OK
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default DeleteDialog
