// frontend/src/components/ActivityChart.jsx
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function ActivityChart({ data }) {
  const labels = data.map(item => {
    const date = new Date(item.date);
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Repositorios nuevos',
        data: data.map(item => item.new_repos || 0),
        borderColor: '#01c38e',
        backgroundColor: 'rgba(1, 195, 142, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
      {
        label: 'Estrellas',
        data: data.map(item => item.stars || 0),
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
      {
        label: 'Forks',
        data: data.map(item => item.forks || 0),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
      {
        label: 'Issues',
        data: data.map(item => item.issues || 0),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9ca3af',
          font: { size: 11 },
          boxWidth: 12,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: { color: '#9ca3af', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.05)' },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700 h-[300px]">
      <h3 className="text-white font-bold mb-4 text-sm">📈 Actividad (últimos 30 días)</h3>
      <Line data={chartData} options={options} />
    </div>
  );
}

export default ActivityChart;