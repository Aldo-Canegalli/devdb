function ProfileStats({ stats }) {
  const statItems = [
    { label: 'Repositorios', value: stats.total_repos || 0, icon: '📁' },
    { label: 'Estrellas recibidas', value: stats.total_stars_received || 0, icon: '⭐' },
    { label: 'Forks', value: stats.total_forks || 0, icon: '🍴' },
    { label: 'Colaboraciones', value: stats.total_collaborations || 0, icon: '👥' },
    { label: 'Incidencias reportadas', value: stats.total_issues || 0, icon: '🐛' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {statItems.map((item, index) => (
        <div key={index} className="bg-[#1a1e29] rounded-xl p-4 text-center border border-gray-700">
          <div className="text-2xl mb-1">{item.icon}</div>
          <div className="text-2xl font-bold text-[#01c38e]">{item.value}</div>
          <div className="text-xs text-gray-400">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export default ProfileStats;