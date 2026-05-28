import { useState, useRef } from 'react'
import { Upload, FileText } from 'lucide-react'

function FileUpload({ onUpload, loading }) {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file) => {
    // Validate file type
    const validTypes = ['.pdf', '.docx', '.doc', '.txt']
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!validTypes.includes(fileExtension)) {
      alert('Please upload a PDF, DOCX, or TXT file')
      return
    }

    // Validate file size (25 MB)
    if (file.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25 MB')
      return
    }

    onUpload(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-violet-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5" />
        Upload Document
      </h2>
      
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-violet-500 bg-violet-50'
            : 'border-gray-300 hover:border-violet-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleChange}
          className="hidden"
          id="file-upload"
          disabled={loading}
        />
        
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <FileText className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">
            Drag and drop a file here, or{' '}
            <span className="text-violet-600 font-semibold">click to browse</span>
          </p>
          <p className="text-sm text-gray-500">
            Supports PDF, DOCX, TXT (Max 25 MB)
          </p>
        </label>
      </div>

      {loading && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
          <p className="text-sm text-gray-600 mt-2">Processing document...</p>
        </div>
      )}
    </div>
  )
}

export default FileUpload
