import React, { useState, useEffect } from 'react'
import axiosInstance from '../utils/axios'
import { Link } from 'react-router-dom'
import {
  AcademicCapIcon,
  BoltIcon,
  ChartBarIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">We're sorry, but there was an error loading the dashboard.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [recentChallenges, setRecentChallenges] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get user stats and progress
      const [statsRes, progressRes, achievementsRes] = await Promise.all([
        axiosInstance.get('/api/challenges/stats/'),
        axiosInstance.get('/api/challenges/progress/'),
        axiosInstance.get('/api/challenges/user-achievements/')
      ])
      
      // Process stats data
      const statsData = statsRes.data || {}
      setStats({
        total_points: statsData.total_points || 0,
        completed_challenges: statsData.completed_challenges || 0,
        in_progress_challenges: statsData.in_progress_challenges || 0,
        category_progress: Array.isArray(statsData.category_progress) 
          ? statsData.category_progress.map(cat => ({
              name: cat.name || '',
              completed_challenges: cat.completed || 0,
              total_challenges: cat.total || 0,
              completion_percentage: ((cat.completed || 0) / (cat.total || 1)) * 100
            }))
          : []
      })

      // Process recent challenges from progress
      const progressData = Array.isArray(progressRes.data) ? progressRes.data : []
      const sortedChallenges = progressData
        .filter(p => p && p.challenge && typeof p === 'object') // Ensure valid progress objects
        .sort((a, b) => {
          const dateA = a.last_attempt_at || a.created_at || '0'
          const dateB = b.last_attempt_at || b.created_at || '0'
          return new Date(dateB) - new Date(dateA)
        })
        .slice(0, 5) // Get only the 5 most recent
        .map(p => ({
          id: p.challenge.id,
          title: p.challenge.title || 'Untitled Challenge',
          difficulty: p.challenge.difficulty || 'medium',
          category: p.challenge.category || { name: 'Uncategorized' },
          status: p.status || 'in_progress',
          points: p.challenge.points || 0,
          last_attempt: p.last_attempt_at || p.created_at || new Date().toISOString()
        }))

      setRecentChallenges(sortedChallenges)

      // Process achievements
      const achievementsData = Array.isArray(achievementsRes.data) ? achievementsRes.data : []
      setAchievements(achievementsData
        .filter(ua => ua && ua.achievement && typeof ua === 'object')
        .map(ua => ({
          id: ua.achievement.id || ua.id || Math.random().toString(),
          name: ua.achievement.name || 'Achievement',
          description: ua.achievement.description || '',
          icon: ua.achievement.icon || 'trophy',
          earned_at: ua.earned_at || new Date().toISOString()
        }))
      )

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Refresh data periodically (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

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
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user?.username}!</h1>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Points</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.total_points?.toLocaleString() || 0}</p>
              </div>
              <BoltIcon className="w-8 h-8 text-primary-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Completed</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.completed_challenges || 0}</p>
              </div>
              <AcademicCapIcon className="w-8 h-8 text-primary-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">In Progress</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.in_progress_challenges || 0}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-primary-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Achievements</p>
                <p className="text-2xl font-bold text-gray-800">{achievements?.length || 0}</p>
              </div>
              <TrophyIcon className="w-8 h-8 text-primary-500" />
            </div>
          </div>
        </div>

        {/* Category Progress */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Category Progress</h2>
          <div className="space-y-4">
            {stats?.category_progress?.map((category) => (
              <div key={category.name} className="group hover:bg-gray-50 p-3 rounded-lg transition-colors">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span className="font-medium">{category.name}</span>
                  <span>{category.completed_challenges}/{category.total_challenges}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary-500 rounded-full h-2.5 transition-all duration-300 group-hover:bg-primary-600"
                    style={{ width: `${category.completion_percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {stats?.category_progress?.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No categories available yet
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Challenges */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Challenges</h2>
            <div className="space-y-4">
              {recentChallenges?.length > 0 ? (
                recentChallenges.map((challenge) => (
                  <Link
                    key={challenge.id}
                    to={`/challenges/${challenge.id}`}
                    className="block p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-800">{challenge.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500">{challenge.category?.name}</span>
                          <span className="text-sm text-primary-600">{challenge.points} pts</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Last attempt: {new Date(challenge.last_attempt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          challenge.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          challenge.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {challenge.difficulty?.charAt(0).toUpperCase() + challenge.difficulty?.slice(1)}
                        </span>
                        <span className={`text-xs font-medium ${
                          challenge.status === 'completed' ? 'text-green-600' :
                          challenge.status === 'in_progress' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {challenge.status?.replace('_', ' ').charAt(0).toUpperCase() + challenge.status?.slice(1)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent challenges.</p>
                  <Link 
                    to="/challenges" 
                    className="inline-block mt-2 text-primary-600 hover:text-primary-700"
                  >
                    Start solving some!
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Achievements</h2>
            <div className="grid grid-cols-1 gap-4">
              {achievements?.length > 0 ? (
                achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-gray-50 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <TrophyIcon className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800">{achievement.name}</h3>
                        <p className="text-sm text-gray-500">{achievement.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Earned: {new Date(achievement.earned_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No achievements yet.</p>
                  <p className="text-sm mt-1">Complete challenges to earn achievements!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
