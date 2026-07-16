// frontend/src/components/StatsCards.jsx
function StatsCards({ stats }) {
  const cards = [
    { label: 'Usuarios', value: stats.total_users || 0, icon: '👤', color: 'from-blue-500 to-blue-700' },
    { label: 'Repositorios', value: stats.total_repos || 0, icon: '📁', color: 'from-green-500 to-green-700' },
    { label: 'Repositorios públicos', value: stats.public_repos || 0, icon: '🌍', color: 'from-cyan-500 to-cyan-700' },
    { label: 'Estrellas', value: stats.total_stars || 0, icon: '⭐', color: 'from-yellow-500 to-yellow-700' },
    { label: 'Forks', value: stats.total_forks || 0, icon: '🍴', color: 'from-purple-500 to-purple-700' },
    { label: 'Issues', value: stats.total_issues || 0, icon: '🐛', color: 'from-red-500 to-red-700' },
    { label: 'Pull Requests', value: stats.total_prs || 0, icon: '🔀', color: 'from-indigo-500 to-indigo-700' },
    { label: 'PRs abiertos', value: stats.open_prs || 0, icon: '🟢', color: 'from-emerald-500 to-emerald-700' },
    { label: 'Tokens generados', value: stats.total_tokens || 0, icon: '🔑', color: 'from-orange-500 to-orange-700' },
    { label: 'Comentarios', value: stats.total_comments || 0, icon: '💬', color: 'from-pink-500 to-pink-700' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${card.color} rounded-xl p-4 text-white shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">{card.icon}</span>
            <span className="text-xs opacity-80">{card.label}</span>
          </div>
          <div className="text-2xl font-bold mt-2">{card.value}</div>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;