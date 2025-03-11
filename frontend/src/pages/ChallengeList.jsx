import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../utils/axios'
import { 
  FunnelIcon, 
  ArrowsUpDownIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

export default function ChallengeList() {
  const [challenges, setChallenges] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ show: false, challengeId: null })
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axiosInstance.get('/api/users/me/')
        setCurrentUser(response.data)
        console.log('Current user:', response.data)
      } catch (err) {
        console.error('Error fetching user data:', err)
      }
    }
    fetchUserData()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const [challengesRes, categoriesRes] = await Promise.all([
          axiosInstance.get('/api/challenges/challenges/'),
          axiosInstance.get('/api/challenges/categories/')
        ])

        const challengesData = challengesRes.data?.results || challengesRes.data || []
        const categoriesData = categoriesRes.data?.results || categoriesRes.data || []

        if (!Array.isArray(challengesData) || !Array.isArray(categoriesData)) {
          throw new Error('Invalid data format received from server')
        }

        setChallenges(challengesData)
        setCategories(categoriesData)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(
          err.response?.data?.message || 
          err.message || 
          'Failed to fetch data. Please try again later.'
        )
        setChallenges([])
        setCategories([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleEdit = (e, challengeId) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/challenges/${challengeId}/edit`)
  }

  const handleDelete = async (e, challengeId) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteModal({ show: true, challengeId })
  }

  const confirmDelete = async () => {
    try {
      await axiosInstance.delete(`/api/challenges/challenges/${deleteModal.challengeId}/`)
      setChallenges(challenges.filter(challenge => challenge.id !== deleteModal.challengeId))
      setDeleteModal({ show: false, challengeId: null })
    } catch (err) {
      console.error('Error deleting challenge:', err)
      setError(err.message || 'Failed to delete challenge')
    }
  }

  const filteredAndSortedChallenges = () => {
    let result = [...challenges]

    // Apply filters
    if (selectedCategory !== 'all') {
      result = result.filter(challenge => challenge.category?.name === selectedCategory)
    }
    if (selectedDifficulty !== 'all') {
      result = result.filter(challenge => challenge.difficulty === selectedDifficulty)
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at) - new Date(a.created_at)
      }
      return new Date(a.created_at) - new Date(b.created_at)
    })

    return result
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Coding Challenges</h1>
        <Link
          to="/challenges/create"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Create Challenge
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 focus:outline-none"
            >
              <FunnelIcon className="h-4 w-4" />
              <span>Filter</span>
            </button>

            {showFilters && (
              <div className="flex gap-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            )}
          </div>

          <button
            onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            <ArrowsUpDownIcon className="h-4 w-4" />
            <span>Sort</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedChallenges().map((challenge) => (
          <div key={challenge.id} className="relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
            <Link
              to={`/challenges/${challenge.id}`}
              className="block p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 hover:text-primary-600">
                    {challenge.title}
                  </h2>
                  <div className="mt-1 text-sm text-gray-500">
                    Created by {challenge.created_by?.username || 'Unknown'} • {' '}
                    {new Date(challenge.created_at).toLocaleDateString()}
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {challenge.description}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  challenge.difficulty?.toLowerCase() === 'easy' ? 'bg-green-100 text-green-800' :
                  challenge.difficulty?.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {challenge.difficulty ? 
                    challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1) :
                    'Unknown'
                  }
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-primary-600 font-semibold">
                    {challenge.points || 0} points
                  </span>
                  {(challenge.submission_count > 0 || challenge.submissions_count > 0) && (
                    <span className="text-sm text-gray-500">
                      {challenge.submission_count || challenge.submissions_count} submissions
                    </span>
                  )}
                </div>
              </div>
            </Link>
            {currentUser && currentUser.id === challenge.created_by?.id && (
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={(e) => handleEdit(e, challenge.id)}
                  className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-primary-50 bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
                  title="Edit challenge"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, challenge.id)}
                  className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                  title="Delete challenge"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredAndSortedChallenges().length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No challenges found matching your filters.</p>
          {(selectedCategory !== 'all' || selectedDifficulty !== 'all') && (
            <button
              onClick={() => {
                setSelectedCategory('all')
                setSelectedDifficulty('all')
              }}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Challenge
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this challenge? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteModal({ show: false, challengeId: null })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
