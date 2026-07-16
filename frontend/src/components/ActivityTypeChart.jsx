// frontend/src/components/ActivityTypeChart.jsx
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function ActivityTypeChart({ data }) {
  const colors = {
    'create_repo': '#01c38e',
    'star_repo': '#fbbf24',
    'fork_repository': '#8b5cf6',
    'create_issue': '#ef4444',
    'upload_file': '#3b82f6',
    'edit_file': '#f59e0b',
    'comment_issue': '#ec4899',
    'generate_token': '#f97316',
    'follow_user': '#06b6d4',
  };

  const labels = data.map(item => {
    const names = {
      'create_repo': '📁 Crear repo',
      'star_repo': '⭐ Estrellas',
      'fork_repository': '🍴 Forks',
      'create_issue': '🐛 Issues',
      'upload_file': '📤 Subir archivo',
      'edit_file': '✏️ Editar archivo',
      'comment_issue': '💬 Comentarios',
      'generate_token': '🔑 Tokens',
      'follow_user': '👥 Seguidores',
    };
    return names[item.action] || item.action;
  });

  const chartData = {
    labels,
    datasets: [
      {
        data: data.map(item => item.count),
        backgroundColor: data.map(item => colors[item.action] || '#6b7280'),
        borderColor: '#1a1e29',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#9ca3af',
          font: { size: 10 },
          boxWidth: 12,
          padding: 8,
        },
      },
    },
  };

  return (
    <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700 h-[280px]">
      <h3 className="text-white font-bold mb-2 text-sm">📊 Tipos de actividad</h3>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}

export default ActivityTypeChart;