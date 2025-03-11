import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

export default function ProgressChart({ data }) {
  const chartData = {
    labels: data.map(d => d.category),
    datasets: [
      {
        label: 'Completed',
        data: data.map(d => d.completed),
        backgroundColor: 'rgb(34, 197, 94)',
      },
      {
        label: 'In Progress',
        data: data.map(d => d.inProgress),
        backgroundColor: 'rgb(234, 179, 8)',
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Challenge Progress by Category',
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
      },
    },
  }

  return (
    <div className="card">
      <Bar data={chartData} options={options} />
    </div>
  )
}
