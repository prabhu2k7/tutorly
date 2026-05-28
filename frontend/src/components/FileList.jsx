import { FileText, Trash2, Calendar } from 'lucide-react'

function FileList({ files, onDelete }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-violet-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-violet-600" />
        Uploaded Files ({files.length})
      </h2>
      
      {files.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No files uploaded yet
        </p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {files.map((file) => (
            <div
              key={file.file_id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <p className="font-medium text-gray-800 truncate">
                      {file.filename}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(file.upload_date)}
                    </span>
                    <span>{file.size_mb.toFixed(2)} MB</span>
                    <span>{file.pages} pages</span>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(file.file_id)}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileList
