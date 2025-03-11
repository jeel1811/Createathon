export default function AchievementCard({ achievement, earned = false }) {
  const {
    name,
    description,
    icon,
    points_required,
    earned_at,
  } = achievement

  return (
    <div className={`card ${earned ? 'border-2 border-primary-500' : 'opacity-75'}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <img
            src={icon}
            alt={name}
            className={`w-12 h-12 ${!earned && 'grayscale'}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-gray-900">
              {name}
            </p>
            <span className="text-sm text-primary-600 font-medium">
              {points_required} points
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {description}
          </p>
          {earned && earned_at && (
            <p className="text-sm text-gray-500 mt-2">
              Earned on {new Date(earned_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
