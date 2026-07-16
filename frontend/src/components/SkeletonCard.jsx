function SkeletonCard({ type = 'repo' }) {
  if (type === 'repo') {
    return (
      <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden animate-pulse">
        <div className="h-32 bg-gray-700/50"></div>
        <div className="p-4 space-y-3">
          <div className="h-5 bg-gray-700/50 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
          <div className="flex gap-2">
            <div className="h-4 bg-gray-700/50 rounded w-12"></div>
            <div className="h-4 bg-gray-700/50 rounded w-12"></div>
          </div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
            <div className="h-4 bg-gray-700/50 rounded w-16"></div>
            <div className="h-4 bg-gray-700/50 rounded w-12"></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'profile') {
    return (
      <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700 animate-pulse">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-700/50 rounded-full"></div>
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-gray-700/50 rounded w-48"></div>
            <div className="h-4 bg-gray-700/50 rounded w-64"></div>
            <div className="h-4 bg-gray-700/50 rounded w-40"></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'file') {
    return (
      <div className="flex items-center justify-between p-4 border-b border-gray-700 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-700/50 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-700/50 rounded w-32"></div>
            <div className="h-3 bg-gray-700/50 rounded w-20"></div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-700/50 rounded w-12"></div>
        </div>
      </div>
    );
  }

  if (type === 'message') {
    return (
      <div className="flex items-center gap-4 p-4 border-b border-gray-700 animate-pulse">
        <div className="w-12 h-12 bg-gray-700/50 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-700/50 rounded w-32"></div>
          <div className="h-3 bg-gray-700/50 rounded w-48"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#132d46] rounded-xl border border-gray-700 p-4 animate-pulse">
      <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-3"></div>
      <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
    </div>
  );
}

export default SkeletonCard;