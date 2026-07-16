// frontend/src/components/Sidebar.jsx
import OnlineFriends from './OnlineFriends';
import ActivityFeed from './ActivityFeed';

function Sidebar() {
  return (
    <aside className="fixed right-0 top-0 h-full w-80 bg-[#132d46]/95 backdrop-blur-md border-l border-gray-800 pt-20 hidden lg:block overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Sección de Amigos */}
        <OnlineFriends />
        
        {/* Actividad reciente */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-lg font-bold text-white mb-4">📊 Actividad reciente</h3>
          <ActivityFeed limit={5} />
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;