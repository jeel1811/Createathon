import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axiosInstance from '../utils/axios'
import { 
  UserCircleIcon, 
  EnvelopeIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

export default function Profile() {
  const { user, updateUser, refreshProfile } = useAuth()
  const [formData, setFormData] = useState({
    email: user?.email || '',
    bio: user?.bio || '',
    github_username: user?.github_username || '',
    linkedin_username: user?.linkedin_username || '',
    website: user?.website || '',
    display_name: user?.display_name || '',
    preferred_language: user?.preferred_language || 'python'
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        bio: user.bio || '',
        github_username: user.github_username || '',
        linkedin_username: user.linkedin_username || '',
        website: user.website || '',
        display_name: user.display_name || '',
        preferred_language: user.preferred_language || 'python'
      })
    }
  }, [user])

  useEffect(() => {
    fetchUserStats()
  }, [])

  useEffect(() => {
    // Update the user's preferred language in localStorage
    if (formData.preferred_language) {
      localStorage.setItem('preferred_language', formData.preferred_language)
    }
  }, [formData.preferred_language])

  const fetchUserStats = async () => {
    try {
      const response = await axiosInstance.get('/api/challenges/stats/')
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    // Filter out empty values
    const dataToSend = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => value !== '')
    )

    try {
      const response = await axiosInstance.patch('/api/users/me/', dataToSend)
      
      // Update local user state
      updateUser(response.data)
      
      // Update preferred language in localStorage
      if (dataToSend.preferred_language) {
        localStorage.setItem('preferred_language', dataToSend.preferred_language)
      }

      // Show success message
      setMessage({
        type: 'success',
        text: 'Profile updated successfully!'
      })

      // Refresh user profile to get latest data
      await refreshProfile()

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' })
      }, 3000)
    } catch (error) {
      console.error('Profile update error:', error.response?.data || error.message)
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 
              Object.values(error.response?.data || {})[0]?.[0] ||
              'Failed to update profile. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        {/* Left column with stats */}
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-2xl font-bold text-gray-900">Profile</h3>
            <p className="mt-1 text-sm text-gray-600">
              Manage your profile information and preferences.
            </p>

            {stats && (
              <div className="mt-6 bg-white rounded-lg shadow p-4">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">Your Stats</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Points</span>
                    <span className="font-medium text-primary-600">{stats.total_points}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed Challenges</span>
                    <span className="font-medium text-primary-600">{stats.completed_challenges}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="font-medium text-primary-600">
                      {stats.success_rate ? `${stats.success_rate}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column with form */}
        <div className="mt-5 md:mt-0 md:col-span-2">
          <form onSubmit={handleSubmit}>
            <div className="shadow sm:rounded-lg overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                {message.text && (
                  <div className={`rounded-md p-4 flex items-center ${
                    message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {message.type === 'success' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
                    )}
                    <p className={`text-sm font-medium ${
                      message.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {message.text}
                    </p>
                  </div>
                )}

                {/* Display Name */}
                <div>
                  <label htmlFor="display_name" className="block text-sm font-medium text-gray-700">
                    Display Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserCircleIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="display_name"
                      id="display_name"
                      value={formData.display_name}
                      onChange={handleChange}
                      className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      placeholder="How should we call you?"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={3}
                      value={formData.bio}
                      onChange={handleChange}
                      className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      placeholder="Tell us about yourself"
                    />
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="url"
                      name="website"
                      id="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      placeholder="https://your-website.com"
                    />
                  </div>
                </div>

                {/* GitHub Username */}
                <div>
                  <label htmlFor="github_username" className="block text-sm font-medium text-gray-700">
                    GitHub Profile
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      https://github.com/
                    </span>
                    <input
                      type="text"
                      name="github_username"
                      id="github_username"
                      value={formData.github_username}
                      onChange={handleChange}
                      className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300"
                      placeholder="username"
                    />
                  </div>
                </div>

                {/* LinkedIn Username */}
                <div>
                  <label htmlFor="linkedin_username" className="block text-sm font-medium text-gray-700">
                    LinkedIn Profile
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      https://linkedin.com/in/
                    </span>
                    <input
                      type="text"
                      name="linkedin_username"
                      id="linkedin_username"
                      value={formData.linkedin_username}
                      onChange={handleChange}
                      className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300"
                      placeholder="username"
                    />
                  </div>
                </div>

                {/* Preferred Language */}
                <div>
                  <label htmlFor="preferred_language" className="block text-sm font-medium text-gray-700">
                    Preferred Programming Language
                  </label>
                  <select
                    id="preferred_language"
                    name="preferred_language"
                    value={formData.preferred_language}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
