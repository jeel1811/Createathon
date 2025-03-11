import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from '../utils/axios'
import Editor from '@monaco-editor/react'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function CreateChallenge() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_name: '',
    difficulty: 'easy',
    points: 100,
    content: '',
    template: '',
    test_cases: [{ input: '', output: '' }],
    time_limit: 30
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch categories
        const categoriesRes = await axios.get('/api/challenges/categories/')
        setCategories(categoriesRes.data)
        
        // If editing, fetch challenge data
        if (id) {
          const challengeRes = await axios.get(`/api/challenges/challenges/${id}/`)
          setFormData({
            ...challengeRes.data,
            category_name: challengeRes.data.category_name
          })
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err.message || 'Failed to fetch data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setError(null)
      const data = {
        ...formData,
        test_cases: formData.test_cases.filter(tc => tc.input || tc.output),
        time_limit: parseInt(formData.time_limit)
      }
      
      if (id) {
        // Update existing challenge
        await axios.put(`/api/challenges/challenges/${id}/`, data)
      } else {
        // Create new challenge
        await axios.post('/api/challenges/challenges/', data)
      }
      
      navigate('/challenges')
    } catch (err) {
      console.error('Error saving challenge:', err)
      setError(err.message || 'Failed to save challenge')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleTestCaseChange = (index, field, value) => {
    setFormData(prev => {
      const newTestCases = [...prev.test_cases]
      newTestCases[index] = {
        ...newTestCases[index],
        [field]: value
      }
      // Add new empty test case if last one is being filled
      if (index === newTestCases.length - 1 && (value !== '')) {
        newTestCases.push({ input: '', output: '' })
      }
      return {
        ...prev,
        test_cases: newTestCases
      }
    })
  }

  const removeTestCase = (index) => {
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, i) => i !== index)
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {id ? 'Edit Challenge' : 'Create New Challenge'}
      </h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Description (Markdown supported)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <input
              type="text"
              name="category_name"
              value={formData.category_name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Difficulty
            </label>
            <select
              name="difficulty"
              value={formData.difficulty}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Points
          </label>
          <input
            type="number"
            name="points"
            value={formData.points}
            onChange={handleInputChange}
            required
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Time Limit (minutes)
          </label>
          <input
            type="number"
            name="time_limit"
            value={formData.time_limit}
            onChange={handleInputChange}
            required
            min="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Problem Content (Markdown)
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            required
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Pre-filled Code (Optional)
          </label>
          <Editor
            height="200px"
            language="python"
            theme="vs-light"
            value={formData.template}
            onChange={(value) => setFormData(prev => ({ ...prev, template: value }))}
            className="border rounded-lg overflow-hidden"
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
            }}
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Test Cases
            </label>
            <button
              type="button"
              onClick={() => setFormData(prev => ({
                ...prev,
                test_cases: [...prev.test_cases, { input: '', output: '' }]
              }))}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Test Case
            </button>
          </div>

          <div className="space-y-6">
            {formData.test_cases.map((testCase, index) => (
              <div key={index} className="flex gap-6 items-start p-6 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1 space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Input
                  </label>
                  <textarea
                    value={testCase.input}
                    onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                    rows={3}
                    placeholder="Enter test case input"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Expected Output
                  </label>
                  <textarea
                    value={testCase.output}
                    onChange={(e) => handleTestCaseChange(index, 'output', e.target.value)}
                    rows={3}
                    placeholder="Enter expected output"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                  />
                </div>
                {index !== formData.test_cases.length - 1 && (
                  <button
                    type="button"
                    onClick={() => removeTestCase(index)}
                    className="mt-8 p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                    title="Remove test case"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          >
            {id ? 'Update Challenge' : 'Create Challenge'}
          </button>
        </div>
      </form>
    </div>
  )
}
