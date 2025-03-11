import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axiosInstance from '../utils/axios'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import { 
  ClockIcon,
  ChatBubbleLeftIcon,
  CheckIcon,
  XMarkIcon,
  PlayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

export default function ChallengeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Update language when user profile changes
  useEffect(() => {
    if (user?.preferred_language) {
      setLanguage(user.preferred_language)
    }
  }, [user])
  
  // Constants
  const DISCUSSION_POLL_INTERVAL_MINUTES = 2
  
  const [challenge, setChallenge] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [discussions, setDiscussions] = useState([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState(localStorage.getItem('preferred_language') || user?.preferred_language || 'python')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentSubmission, setCurrentSubmission] = useState(null)
  const [runResults, setRunResults] = useState(null)
  const [activeTab, setActiveTab] = useState('description')
  const [lastFetchedDiscussionTime, setLastFetchedDiscussionTime] = useState(null)
  const [selectedTestCase, setSelectedTestCase] = useState(0)
  const [testResults, setTestResults] = useState([])
  const [passedTests, setPassedTests] = useState(0)
  const [totalTests, setTotalTests] = useState(0)

  const fetchDiscussions = async () => {
    try {
      const response = await axiosInstance.get(`/api/challenges/challenges/${id}/discussions/`)
      setDiscussions(response.data)
    } catch (err) {
      console.error('Error fetching discussions:', err)
      toast.error('Failed to load discussions')
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!user) {
      navigate('/login')
      return
    }

    if (!newComment.trim()) {
      toast.error('Please enter a comment')
      return
    }

    try {
      setSubmitting(true)
      const response = await axiosInstance.post(`/api/challenges/challenges/${id}/discussions/`, {
        content: newComment.trim()
      })
      
      // Update discussions state with the new comment
      setDiscussions(prev => [...prev, response.data])
      setNewComment('')
      toast.success('Comment added successfully')
    } catch (err) {
      console.error('Error adding comment:', err)
      toast.error('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRunCode = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!code.trim()) {
      toast.error('Please enter some code before running')
      return
    }

    try {
      setIsRunning(true)
      const testResults = []
      
      // Run code against each test case
      for (const testCase of challenge.test_cases) {
        try {
          const response = await axiosInstance.post(`/api/challenges/challenges/${id}/run/`, {
            code: code.trim(),
            language: language,
            input: testCase.input,
            expected_output: testCase.output
          })

          // Add result to test results array
          testResults.push({
            input: testCase.input,
            expected_output: testCase.output,
            actual_output: response.data.output,
            error: response.data.error,
            passed: response.data.output?.trim() === testCase.output?.trim() && !response.data.error
          })
        } catch (error) {
          // If a test case fails, add it to results with error
          testResults.push({
            input: testCase.input,
            expected_output: testCase.output,
            actual_output: '',
            error: error.response?.data?.error || 'Failed to run code',
            passed: false
          })
        }
      }

      // Update test results state
      setTestResults(testResults)
      
      // Calculate pass/fail statistics
      const passedCount = testResults.filter(result => result.passed).length
      setPassedTests(passedCount)
      setTotalTests(testResults.length)

      // Show appropriate toast message
      if (passedCount === testResults.length) {
        toast.success('All test cases passed! 🎉')
      } else {
        toast('Some test cases failed', {
          icon: '⚠️',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error running code:', error)
      toast.error('Failed to run code. Please try again.')
      setTestResults([])
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!code.trim()) {
      setError('Please enter some code before submitting')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      setCurrentSubmission(null)

      const response = await axiosInstance.post(`/api/challenges/challenges/${id}/submit/`, {
        code: code.trim(),
        language
      })

      setCurrentSubmission(response.data)
      
      // Refresh submissions list
      const submissionsRes = await axiosInstance.get(`/api/challenges/challenges/${id}/submissions/`)
      setSubmissions(submissionsRes.data)
    } catch (err) {
      console.error('Error submitting code:', err)
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login')
      } else {
        setError(err.response?.data?.detail || 'Failed to submit code. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [challengeRes, submissionsRes, discussionsRes] = await Promise.all([
        axiosInstance.get(`/api/challenges/challenges/${id}/`),
        axiosInstance.get(`/api/challenges/challenges/${id}/submissions/`),
        axiosInstance.get(`/api/challenges/challenges/${id}/discussions/`)
      ])

      setChallenge(challengeRes.data)
      setSubmissions(submissionsRes.data)
      setDiscussions(discussionsRes.data)
      setCode(challengeRes.data.template || '')
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  useEffect(() => {
    if (activeTab === 'discussions') {
      // Convert minutes to milliseconds
      const pollInterval = setInterval(fetchDiscussions, DISCUSSION_POLL_INTERVAL_MINUTES * 60 * 1000)
      return () => clearInterval(pollInterval)
    }
  }, [id, activeTab])

  const renderDiscussions = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-6 mt-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Discussions</h3>
      
      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="mb-6">
        <div className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add your comment..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            rows="3"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>

      {/* Discussion List */}
      <div className="space-y-4">
        {discussions.map((discussion) => (
          <div key={discussion.id} className="border-b border-gray-200 pb-4 last:border-0">
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{discussion.user.username}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(discussion.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="mt-1 text-sm text-gray-700">{discussion.content}</p>
              </div>
            </div>
          </div>
        ))}
        {discussions.length === 0 && (
          <p className="text-gray-500 text-center py-4">No discussions yet. Be the first to comment!</p>
        )}
      </div>
    </div>
  )

  const renderTestResults = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Test Results</h2>
        {testResults.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">
              {passedTests}/{totalTests} Passed
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${
                  passedTests === totalTests ? 'bg-green-600' : 'bg-yellow-400'
                }`}
                style={{ width: `${(passedTests / totalTests) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {testResults.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          {/* Error Display */}
          {testResults.some(result => result.error) && (
            <div className="p-4 mb-4 border-b">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-500">⚠️</span>
                <span className="font-medium text-red-700">Error Found</span>
              </div>
              <pre className="text-sm text-red-600 whitespace-pre-wrap">
                {testResults.find(result => result.error)?.error}
              </pre>
            </div>
          )}

          {/* Tab Headers */}
          <div className="flex overflow-x-auto border-b">
            {testResults.map((result, index) => (
              <button
                key={index}
                onClick={() => setSelectedTestCase(index)}
                className={`px-4 py-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                  selectedTestCase === index
                    ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Test Case {index + 1}
                <span 
                  className={`w-2 h-2 rounded-full ${
                    result.passed ? 'bg-green-500' : 'bg-red-500'
                  }`} 
                />
              </button>
            ))}
          </div>

          {/* Selected Test Case Content */}
          {testResults[selectedTestCase] && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">
                  Test Case {selectedTestCase + 1}
                </h3>
                <span 
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    testResults[selectedTestCase].passed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {testResults[selectedTestCase].passed ? 'Passed' : 'Failed'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Input:
                  </div>
                  <pre className="bg-gray-50 p-3 rounded-lg text-sm font-mono">
                    {challenge.test_cases[selectedTestCase].input || '<no input>'}
                  </pre>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Expected Output:
                  </div>
                  <pre className="bg-gray-50 p-3 rounded-lg text-sm font-mono">
                    {challenge.test_cases[selectedTestCase].output || '<no output>'}
                  </pre>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Your Output:
                  </div>
                  <pre 
                    className={`p-3 rounded-lg text-sm font-mono ${
                      testResults[selectedTestCase].passed ? 'bg-gray-50' : 'bg-red-50'
                    }`}
                  >
                    {testResults[selectedTestCase].actual_output || '<no output>'}
                  </pre>
                </div>

                {testResults[selectedTestCase].error && (
                  <div>
                    <div className="text-sm font-medium text-red-700 mb-2">
                      Error:
                    </div>
                    <pre className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap">
                      {testResults[selectedTestCase].error}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {testResults.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Run your code to see test results
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  const SubmissionSection = ({ submissions }) => {
    const [expandedSubmission, setExpandedSubmission] = useState(null);
    const [showCode, setShowCode] = useState({});

    const toggleSubmission = (submissionId) => {
      setExpandedSubmission(expandedSubmission === submissionId ? null : submissionId);
    };

    const toggleCode = (submissionId) => {
      setShowCode(prev => ({
        ...prev,
        [submissionId]: !prev[submissionId]
      }));
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'passed': return 'text-green-600';
        case 'failed': return 'text-red-600';
        case 'running': return 'text-yellow-600';
        default: return 'text-gray-600';
      }
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString();
    };

    return (
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Your Submissions</h3>
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="border rounded-lg shadow-sm">
              <div 
                onClick={() => toggleSubmission(submission.id)}
                className="p-4 cursor-pointer flex justify-between items-center hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <span className={`font-medium ${getStatusColor(submission.status)}`}>
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </span>
                  <span className="text-gray-600">{formatDate(submission.created_at)}</span>
                  <span className="text-gray-600">
                    {submission.test_results.filter(test => test.passed).length} / {submission.test_results.length} Tests Passed
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 transform transition-transform ${
                    expandedSubmission === submission.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {expandedSubmission === submission.id && (
                <div className="border-t p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <span>Language: {submission.language}</span>
                        <span>Execution Time: {submission.execution_time ? `${submission.execution_time.toFixed(2)}s` : 'N/A'}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCode(submission.id);
                        }}
                        className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-600 rounded-md hover:bg-primary-50"
                      >
                        {showCode[submission.id] ? 'Hide Code' : 'Show Code'}
                      </button>
                    </div>

                    {showCode[submission.id] && (
                      <div className="border rounded-lg p-4 bg-gray-50 mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Submitted Code:</p>
                        <Editor
                          height="200px"
                          language={submission.language.toLowerCase()}
                          value={submission.code}
                          theme="vs-light"
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 14
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {submission.test_results.map((test, index) => (
                        <div key={index} className="border rounded p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Test Case {index + 1}</span>
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                              test.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {test.passed ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-700">Input:</p>
                              <pre className="mt-1 bg-gray-50 p-2 rounded">{test.input || ''}</pre>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">Expected Output:</p>
                              <pre className="mt-1 bg-gray-50 p-2 rounded">{test.expected_output || ''}</pre>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">Your Output:</p>
                              <pre className={`mt-1 bg-gray-50 p-2 rounded ${
                                test.passed ? 'bg-green-50' : 'bg-red-50'
                              }`}>{test.output || '<no output>'}</pre>
                            </div>
                            {!test.passed && (
                              <div className="col-span-2">
                                <p className="font-medium text-gray-700">Expected Output:</p>
                                <pre className="mt-1 bg-gray-50 p-2 rounded">{test.expected_output || ''}</pre>
                              </div>
                            )}
                            {test.error && (
                              <div className="col-span-2">
                                <p className="font-medium text-red-700">Error:</p>
                                <pre className="bg-red-50 text-red-700 rounded p-2 text-sm font-mono whitespace-pre-wrap">
                                  {test.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {submission.feedback && (
                      <div className="mt-4">
                        <p className="font-medium text-gray-700">Feedback:</p>
                        <p className="mt-1 text-gray-600">{submission.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Problem Description */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">{challenge.title}</h1>
        <div className="prose max-w-none">
          <ReactMarkdown>{challenge.content}</ReactMarkdown>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Sample Test Cases</h2>
          {challenge.test_cases.length > 2 && (
            <div className="text-sm text-gray-500">
              Showing 2 of {challenge.test_cases.length} test cases
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {challenge.test_cases.slice(0, 2).map((test, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
                <h3 className="font-medium">Sample Test Case {index + 1}</h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Input:</div>
                  <pre className="text-sm bg-gray-50 p-2 rounded">{test.input || '<no input>'}</pre>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Expected Output:</div>
                  <pre className="text-sm bg-gray-50 p-2 rounded">{test.output || '<no output>'}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Editor */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">Solution</h2>
            <select
              className="bg-white border border-gray-300 rounded-lg py-2 px-4 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <ClockIcon className="h-5 w-5" />
            <span>Time Limit: {challenge.time_limit} Minutes</span>
          </div>
        </div>

        <div className="h-[500px] border border-gray-200 rounded-lg overflow-hidden">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={setCode}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              automaticLayout: true,
            }}
          />
        </div>

        <div className="mt-4 flex gap-4">
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isRunning ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <PlayIcon className="h-5 w-5" />
            )}
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <CheckIcon className="h-5 w-5" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit Solution'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      {renderTestResults()}

      {/* Submissions */}
      <SubmissionSection submissions={submissions} />

      {/* Discussion Section */}
      {renderDiscussions()}
    </div>
  )
}
