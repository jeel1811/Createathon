import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
]

export default function CodeEditor({ initialCode = '', onSubmit }) {
  const [code, setCode] = useState(initialCode)
  const [language, setLanguage] = useState('python')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!code.trim()) return
    
    setIsSubmitting(true)
    try {
      await onSubmit({ code, language })
    } catch (error) {
      console.error('Failed to submit code:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="input max-w-xs"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn btn-primary flex items-center space-x-2"
        >
          {isSubmitting && (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          )}
          <span>Submit Solution</span>
        </button>
      </div>

      <div className="h-[500px] border border-gray-300 rounded-md overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={setCode}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            tabSize: 4,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  )
}
