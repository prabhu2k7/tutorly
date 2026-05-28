import { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import { GraduationCap, Share2, Check, Pencil } from 'lucide-react'
import FileUpload from './components/FileUpload'
import YoutubeImport from './components/YoutubeImport'
import ChatInterface from './components/ChatInterface'
import FileList from './components/FileList'
import WelcomeScreen from './components/WelcomeScreen'
import SuccessDialog from './components/SuccessDialog'
import DeleteDialog from './components/DeleteDialog'

const API_BASE = '/api'
const KB_STORAGE_KEY = 'tutor_kb_id'

function getKbFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('kb')
}

function App() {
  const studentKbId = useMemo(() => getKbFromUrl(), [])
  if (studentKbId) {
    return <StudentView kbId={studentKbId} />
  }
  return <CreatorView />
}

function StudentView({ kbId }) {
  const [kbInfo, setKbInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/kb/${kbId}`)
        if (!cancelled) setKbInfo(data)
      } catch (err) {
        if (err.response?.status === 404 && !cancelled) {
          setNotFound(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [kbId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
        <div className="text-gray-600">Loading course…</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Course not found</h1>
          <p className="text-gray-600">This share link may be wrong or the course was deleted.</p>
        </div>
      </div>
    )
  }

  const courseName = kbInfo?.name || 'Course'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <GraduationCap className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">AI Tutor</div>
              <h1 className="text-2xl font-bold text-gray-900">{courseName}</h1>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            Ask anything from the course material. Citations link back to the exact moment in the source video.
          </p>
        </div>
        <ChatInterface
          kbId={kbId}
          placeholder={`Ask a question about ${courseName}...`}
          greeting={`Hi! I'm the AI tutor for ${courseName}. Try asking me about the course material.`}
        />
      </div>
    </div>
  )
}

function CreatorView() {
  const [kbId, setKbId] = useState(null)
  const [kbInfo, setKbInfo] = useState(null)
  const [files, setFiles] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [importingYoutube, setImportingYoutube] = useState(false)
  const [creating, setCreating] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [needsWelcome, setNeedsWelcome] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [uploadedFilename, setUploadedFilename] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletedFilename, setDeletedFilename] = useState('')
  const editInputRef = useRef(null)

  useEffect(() => {
    const stored = localStorage.getItem(KB_STORAGE_KEY)
    if (!stored) {
      setNeedsWelcome(true)
      setBootstrapping(false)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/kb/${stored}`)
        if (!cancelled) {
          setKbId(stored)
          setKbInfo(data)
        }
      } catch (err) {
        if (err.response?.status === 404) {
          // Stored KB no longer exists; restart onboarding.
          localStorage.removeItem(KB_STORAGE_KEY)
          if (!cancelled) setNeedsWelcome(true)
        } else {
          console.error('Failed to load KB:', err)
          alert('Could not reach the backend. Make sure it is running on http://localhost:8000')
        }
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (kbId) {
      fetchFiles()
      fetchStats()
    }
  }, [kbId])

  useEffect(() => {
    if (editingName && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingName])

  const handleCreateCourse = async (name) => {
    setCreating(true)
    try {
      const { data } = await axios.post(`${API_BASE}/kb`, { name })
      localStorage.setItem(KB_STORAGE_KEY, data.kb_id)
      setKbId(data.kb_id)
      setKbInfo(data)
      setNeedsWelcome(false)
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Could not create the course')
    } finally {
      setCreating(false)
    }
  }

  const handleSaveName = async () => {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === kbInfo?.name) {
      setEditingName(false)
      return
    }
    try {
      const { data } = await axios.patch(`${API_BASE}/kb/${kbId}`, { name: trimmed })
      setKbInfo(data)
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not rename')
    } finally {
      setEditingName(false)
    }
  }

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/kb/${kbId}/files`)
      setFiles(response.data)
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/kb/${kbId}/stats`)
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleFileUpload = async (file) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await axios.post(
        `${API_BASE}/kb/${kbId}/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      await fetchFiles()
      await fetchStats()
      setUploadedFilename(response.data.filename || file.name)
      setShowSuccessDialog(true)
    } catch (error) {
      if (error.code === 'ERR_NETWORK' || (error.message || '').includes('Network Error')) {
        alert('Cannot connect to backend. Make sure it is running on http://localhost:8000')
      } else {
        alert(error.response?.data?.detail || error.message || 'Error uploading file')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleYoutubeImport = async (url) => {
    setImportingYoutube(true)
    try {
      const response = await axios.post(`${API_BASE}/kb/${kbId}/youtube`, { url })
      await fetchFiles()
      await fetchStats()
      setUploadedFilename(response.data.filename || 'YouTube transcript')
      setShowSuccessDialog(true)
      return true
    } catch (error) {
      if (error.code === 'ERR_NETWORK' || (error.message || '').includes('Network Error')) {
        alert('Cannot connect to backend. Make sure it is running on http://localhost:8000')
      } else {
        alert(error.response?.data?.detail || error.message || 'Could not import this video')
      }
      return false
    } finally {
      setImportingYoutube(false)
    }
  }

  const handleDeleteFile = async (fileId) => {
    const fileToDelete = files.find((f) => f.file_id === fileId)
    const fileName = fileToDelete ? fileToDelete.filename : 'Unknown'
    if (!confirm('Delete this file from your course?')) return
    try {
      await axios.delete(`${API_BASE}/kb/${kbId}/files/${fileId}`)
      await fetchFiles()
      await fetchStats()
      setDeletedFilename(fileName)
      setShowDeleteDialog(true)
    } catch (error) {
      alert(error.response?.data?.detail || 'Error deleting file')
    }
  }

  const shareLink = kbId ? `${window.location.origin}/?kb=${kbId}` : ''

  const copyShareLink = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      window.prompt('Copy this link:', shareLink)
    }
  }

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
        <div className="text-gray-600">Loading…</div>
      </div>
    )
  }

  if (needsWelcome) {
    return <WelcomeScreen onCreate={handleCreateCourse} creating={creating} />
  }

  const courseName = kbInfo?.name || 'Your course'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-indigo-600 font-semibold mb-1">
                Creator dashboard
              </div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={editInputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                    className="text-3xl font-bold text-gray-900 border-b-2 border-indigo-500 focus:outline-none w-full"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditName(courseName); setEditingName(true) }}
                  className="group flex items-center gap-2 text-left"
                  title="Click to rename"
                >
                  <h1 className="text-3xl font-bold text-gray-900">{courseName}</h1>
                  <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              <p className="text-gray-600 mt-1">
                Add YouTube videos or upload documents. Share the link with your students.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="w-4 h-4 text-indigo-700" />
              <span className="text-sm font-semibold text-indigo-900">Share with students</span>
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareLink}
                className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded text-sm font-mono"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={copyShareLink}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
              >
                {linkCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {linkCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {stats && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Materials</div>
                <div className="text-2xl font-bold text-blue-600">{stats.total_files}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Storage</div>
                <div className="text-2xl font-bold text-green-600">{stats.total_size_mb} MB</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Pages</div>
                <div className="text-2xl font-bold text-purple-600">{stats.total_pages}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Characters</div>
                <div className="text-2xl font-bold text-orange-600">
                  {(stats.total_chars / 1000).toFixed(0)}K
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <YoutubeImport onImport={handleYoutubeImport} importing={importingYoutube} />
            <FileUpload onUpload={handleFileUpload} loading={loading} />
            <FileList files={files} onDelete={handleDeleteFile} />
          </div>
          <div className="lg:col-span-2">
            <ChatInterface
              kbId={kbId}
              placeholder="Preview your tutor — ask a question..."
              greeting={`Preview mode. This is what your students will see when they open ${courseName}.`}
            />
          </div>
        </div>
      </div>

      <SuccessDialog
        isOpen={showSuccessDialog}
        filename={uploadedFilename}
        onClose={() => setShowSuccessDialog(false)}
      />
      <DeleteDialog
        isOpen={showDeleteDialog}
        filename={deletedFilename}
        onClose={() => setShowDeleteDialog(false)}
      />
    </div>
  )
}

export default App
