import { Link } from 'react-router-dom'

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
}

export default function ChallengeCard({ challenge }) {
  const {
    id,
    title,
    description,
    difficulty,
    points,
    category_name,
  } = challenge

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Link
            to={`/challenges/${id}`}
            className="text-xl font-semibold text-gray-900 hover:text-primary-600"
          >
            {title}
          </Link>
          <p className="text-gray-600 line-clamp-2">{description}</p>
        </div>
        <span className="text-lg font-semibold text-primary-600">
          {points} pts
        </span>
      </div>
      
      <div className="mt-4 flex items-center space-x-2">
        <span
          className={`badge ${difficultyColors[difficulty]}`}
        >
          {difficulty}
        </span>
        <span className="badge bg-gray-100 text-gray-800">
          {category_name}
        </span>
      </div>
    </div>
  )
}
