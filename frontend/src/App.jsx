import { useState, useEffect, useMemo, useRef } from 'react'
import {
  GraduationCap, Share2, Check, Pencil, Key, Info, AlertCircle, RotateCcw,
} from 'lucide-react'
import FileUpload from './components/FileUpload'
import YoutubeImport from './components/YoutubeImport'
import ChatInterface from './components/ChatInterface'
import FileList from './components/FileList'
import WelcomeScreen from './components/WelcomeScreen'
import ApiKeyModal from './components/ApiKeyModal'
import AboutModal from './components/AboutModal'
import SuccessDialog from './components/SuccessDialog'
import DeleteDialog from './components/DeleteDialog'
import { apiClient, getStoredKey } from './lib/api'

const KB_STORAGE_KEY = 'tutorly_kb_id'

function getKbFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('kb')
}

function App() {
  const studentKbId = useMemo(() => getKbFromUrl(), [])
  if (studentKbId) return <StudentView kbId={studentKbId} />
  return <CreatorView />
}

function TopBar({ hasKey, onOpenKey, onOpenAbout, onNewCourse }) {
  return (
    <div className="absolute top-0 right-0 p-4 flex items-center gap-2 z-10">
      {onNewCourse && (
        <button
          onClick={onNewCourse}
          className="px-3 py-1.5 text-sm font-medium text-violet-900 bg-white/70 hover:bg-white border border-violet-200 rounded-lg flex items-center gap-1.5 backdrop-blur-sm shadow-sm transition-colors"
          title="Start a new course"
        >
          <RotateCcw className="w-4 h-4" /> New course
        </button>
      )}
      <button
        onClick={onOpenAbout}
        className="px-3 py-1.5 text-sm font-medium text-violet-900 bg-white/70 hover:bg-white border border-violet-200 rounded-lg flex items-center gap-1.5 backdrop-blur-sm shadow-sm transition-colors"
      >
        <Info className="w-4 h-4" /> About
      </button>
      <button
        onClick={onOpenKey}
        className={
          'px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 backdrop-blur-sm shadow-sm border transition-colors ' +
          (hasKey
            ? 'text-violet-900 bg-white/70 hover:bg-white border-violet-200'
            : 'text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 border-transparent')
        }
      >
        <Key className="w-4 h-4" />
        {hasKey ? 'API key' : 'Set API key'}
      </button>
    </div>
  )
}

function NoKeyBanner({ onOpenKey }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-900">Set your OpenAI API key to start chatting</p>
        <p className="text-xs text-amber-800 mt-0.5">
          Tutorly is BYOK — your key is stored only in your browser and never sent to our servers.
        </p>
      </div>
      <button
        onClick={onOpenKey}
        className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg whitespace-nowrap"
      >
        Set key
      </button>
    </div>
  )
}

function StudentView({ kbId }) {
  const [kbInfo, setKbInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [hasKey, setHasKey] = useState(Boolean(getStoredKey()))

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await apiClient.get(`/kb/${kbId}`)
        if (!cancelled) setKbInfo(data)
      } catch (err) {
        if (err.response?.status === 404 && !cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    if (!getStoredKey()) setShowApiKey(true)
    return () => { cancelled = true }
  }, [kbId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-fuchsia-50 to-amber-50">
        <div className="text-gray-600">Loading course…</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-fuchsia-50 to-amber-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md p-8 text-center border border-violet-100">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Course not found</h1>
          <p className="text-gray-600">This share link may be wrong or the course was deleted.</p>
        </div>
      </div>
    )
  }

  const courseName = kbInfo?.name || 'Course'

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-violet-50 via-fuchsia-50 to-amber-50">
      <TopBar
        hasKey={hasKey}
        onOpenKey={() => setShowApiKey(true)}
        onOpenAbout={() => setShowAbout(true)}
      />

      <div className="container mx-auto px-4 pt-16 pb-8 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-md p-6 mb-4 border border-violet-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-violet-600 font-semibold">AI Tutor</div>
              <h1 className="text-2xl font-bold text-gray-900">{courseName}</h1>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            Ask anything from the course material. Citations link back to the exact moment in the source video.
          </p>
        </div>

        {!hasKey && <NoKeyBanner onOpenKey={() => setShowApiKey(true)} />}

        <ChatInterface
          kbId={kbId}
          placeholder={`Ask a question about ${courseName}...`}
          greeting={`Hi! I'm the AI tutor for ${courseName}. Try asking me about the course material.`}
          suggestedQuestions={kbInfo?.suggested_questions || []}
          onMissingKey={() => setShowApiKey(true)}
        />
      </div>

      <ApiKeyModal
        isOpen={showApiKey}
        onClose={() => setShowApiKey(false)}
        onSaved={(k) => setHasKey(Boolean(k))}
      />
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
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
  const [showApiKey, setShowApiKey] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [hasKey, setHasKey] = useState(Boolean(getStoredKey()))
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
        const { data } = await apiClient.get(`/kb/${stored}`)
        if (!cancelled) {
          setKbId(stored)
          setKbInfo(data)
        }
      } catch (err) {
        if (err.response?.status === 404) {
          localStorage.removeItem(KB_STORAGE_KEY)
          if (!cancelled) setNeedsWelcome(true)
        } else {
          console.error('Failed to load KB:', err)
          alert('Could not reach the backend. Make sure it is running.')
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
      const { data } = await apiClient.post('/kb', { name })
      localStorage.setItem(KB_STORAGE_KEY, data.kb_id)
      setKbId(data.kb_id)
      setKbInfo(data)
      setNeedsWelcome(false)
      if (!getStoredKey()) setShowApiKey(true)
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Could not create the course')
    } finally {
      setCreating(false)
    }
  }

  const handleCreateFromYoutube = async (url) => {
    setCreating(true)
    try {
      const { data } = await apiClient.post('/kb_from_youtube', { url })
      localStorage.setItem(KB_STORAGE_KEY, data.kb_id)
      setKbId(data.kb_id)
      setKbInfo(data)
      setNeedsWelcome(false)
    } catch (err) {
      // Combined errors may carry the kb_id (course created, import failed).
      const detail = err.response?.data?.detail
      if (detail && typeof detail === 'object' && detail.kb_id) {
        localStorage.setItem(KB_STORAGE_KEY, detail.kb_id)
        setKbId(detail.kb_id)
        setNeedsWelcome(false)
        alert(`Course created, but the video import failed:\n\n${detail.message}\n\nTry again from the dashboard, or upload a .txt transcript instead.`)
        return
      }
      if (err.response?.status === 401) {
        setShowApiKey(true)
        return
      }
      alert(detail || err.message || 'Could not import that video')
    } finally {
      setCreating(false)
    }
  }

  const handleNewCourse = () => {
    if (!confirm('Start a new course? Your current course stays put — students with the share link can still use it.')) return
    localStorage.removeItem(KB_STORAGE_KEY)
    setKbId(null)
    setKbInfo(null)
    setFiles([])
    setStats(null)
    setNeedsWelcome(true)
  }

  const handleSaveName = async () => {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === kbInfo?.name) {
      setEditingName(false)
      return
    }
    try {
      const { data } = await apiClient.patch(`/kb/${kbId}`, { name: trimmed })
      setKbInfo(data)
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not rename')
    } finally {
      setEditingName(false)
    }
  }

  const fetchFiles = async () => {
    try {
      const { data } = await apiClient.get(`/kb/${kbId}/files`)
      setFiles(data)
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const { data } = await apiClient.get(`/kb/${kbId}/stats`)
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const requireKey = () => {
    if (!getStoredKey()) {
      setShowApiKey(true)
      return false
    }
    return true
  }

  const handleFileUpload = async (file) => {
    if (!requireKey()) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await apiClient.post(`/kb/${kbId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await fetchFiles()
      await fetchStats()
      setUploadedFilename(data.filename || file.name)
      setShowSuccessDialog(true)
    } catch (error) {
      if (error.response?.status === 401) setShowApiKey(true)
      alert(error.response?.data?.detail || error.message || 'Error uploading file')
    } finally {
      setLoading(false)
    }
  }

  const handleYoutubeImport = async (url) => {
    if (!requireKey()) return false
    setImportingYoutube(true)
    try {
      const { data } = await apiClient.post(`/kb/${kbId}/youtube`, { url })
      await fetchFiles()
      await fetchStats()
      setUploadedFilename(data.filename || 'YouTube transcript')
      setShowSuccessDialog(true)
      return true
    } catch (error) {
      if (error.response?.status === 401) setShowApiKey(true)
      alert(error.response?.data?.detail || error.message || 'Could not import this video')
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
      await apiClient.delete(`/kb/${kbId}/files/${fileId}`)
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-fuchsia-50 to-amber-50">
        <div className="text-gray-600">Loading…</div>
      </div>
    )
  }

  if (needsWelcome) {
    return (
      <>
        <WelcomeScreen
          onCreateByName={handleCreateCourse}
          onCreateFromYoutube={handleCreateFromYoutube}
          creating={creating}
          hasKey={hasKey}
          onRequestKey={() => setShowApiKey(true)}
        />
        <ApiKeyModal
          isOpen={showApiKey}
          onClose={() => setShowApiKey(false)}
          onSaved={(k) => setHasKey(Boolean(k))}
        />
      </>
    )
  }

  const courseName = kbInfo?.name || 'Your course'

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-violet-50 via-fuchsia-50 to-amber-50">
      <TopBar
        hasKey={hasKey}
        onOpenKey={() => setShowApiKey(true)}
        onOpenAbout={() => setShowAbout(true)}
        onNewCourse={handleNewCourse}
      />

      <div className="container mx-auto px-4 pt-16 pb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-violet-100">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-violet-600 font-semibold mb-1">
                Creator dashboard
              </div>
              {editingName ? (
                <input
                  ref={editInputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  className="text-3xl font-bold text-gray-900 border-b-2 border-violet-500 focus:outline-none w-full"
                />
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

          {!hasKey && (
            <div className="mt-5">
              <NoKeyBanner onOpenKey={() => setShowApiKey(true)} />
            </div>
          )}

          <div className="mt-4 p-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="w-4 h-4 text-violet-700" />
              <span className="text-sm font-semibold text-violet-900">Share with students</span>
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareLink}
                className="flex-1 px-3 py-2 bg-white border border-violet-200 rounded text-sm font-mono"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={copyShareLink}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded transition-colors flex items-center gap-2 text-sm"
              >
                {linkCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {linkCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {stats && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-violet-50 p-4 rounded-lg border border-violet-100">
                <div className="text-sm text-gray-600">Materials</div>
                <div className="text-2xl font-bold text-violet-700">{stats.total_files}</div>
              </div>
              <div className="bg-fuchsia-50 p-4 rounded-lg border border-fuchsia-100">
                <div className="text-sm text-gray-600">Storage</div>
                <div className="text-2xl font-bold text-fuchsia-700">{stats.total_size_mb} MB</div>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                <div className="text-sm text-gray-600">Pages</div>
                <div className="text-2xl font-bold text-amber-700">{stats.total_pages}</div>
              </div>
              <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
                <div className="text-sm text-gray-600">Characters</div>
                <div className="text-2xl font-bold text-rose-700">
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
              suggestedQuestions={kbInfo?.suggested_questions || []}
              onMissingKey={() => setShowApiKey(true)}
            />
          </div>
        </div>
      </div>

      <ApiKeyModal
        isOpen={showApiKey}
        onClose={() => setShowApiKey(false)}
        onSaved={(k) => setHasKey(Boolean(k))}
      />
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
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
