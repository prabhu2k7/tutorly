import { X, Sparkles, Youtube, Shield, Github, ExternalLink } from 'lucide-react'

function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-violet-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-violet-100">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">About Tutorly</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">What is Tutorly?</h3>
            <p className="text-gray-700 leading-relaxed">
              Tutorly turns a course creator&apos;s YouTube videos into a 24/7 AI tutor
              their students can chat with. Paste a video URL, get a share link, send
              it to your students. The bot answers strictly from your content — with
              clickable timestamps that jump back to the exact moment in the source video.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">How it works</h3>
            <ol className="space-y-2 text-gray-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-sm font-semibold flex items-center justify-center">1</span>
                <span>You paste a YouTube URL. Tutorly pulls the public transcript (no API key needed, no video re-uploaded).</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-sm font-semibold flex items-center justify-center">2</span>
                <span>The transcript is split into chunks (with timestamps preserved) and embedded with OpenAI.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-sm font-semibold flex items-center justify-center">3</span>
                <span>When a student asks a question, the most relevant chunks are retrieved and a strict-grounding GPT call writes the answer, citing the moments it used.</span>
              </li>
            </ol>
          </section>

          <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Bring your own key (BYOK)</p>
                <p>
                  This is a free, open-source demo. You provide your own OpenAI API key —
                  it&apos;s stored only in <em>your browser</em>, never on our servers, and
                  sent only with your own requests. Typical cost per question is ~$0.001.
                </p>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-amber-800 hover:underline font-medium"
                >
                  Get an OpenAI key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">For creators</h3>
            <p className="text-gray-700 leading-relaxed mb-2">
              Use the creator dashboard to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li className="flex gap-2"><Youtube className="w-4 h-4 text-red-500 flex-shrink-0 mt-1" /> <span>Import YouTube videos by URL</span></li>
              <li className="ml-6">Upload PDFs / DOCX / TXT alongside</li>
              <li className="ml-6">Name your course and copy a share link</li>
              <li className="ml-6">Preview what students will see</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tech</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              FastAPI + ChromaDB + OpenAI (text-embedding-3-small, gpt-4o-mini) backend.
              React + Vite + Tailwind frontend. Multi-tenant via a per-creator{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">kb_id</code>. Open source —
              fork it and run it yourself.
            </p>
          </section>

          <div className="flex gap-3 pt-2">
            <a
              href="https://github.com/prabhu2k7/tutorly"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Github className="w-4 h-4" /> Source on GitHub
            </a>
            <a
              href="https://huggingface.co/spaces/pra2k1/tutorly"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
            >
              🤗 Live Space
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutModal
