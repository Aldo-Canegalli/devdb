import { Link } from 'react-router-dom'

function Logo({ size = 'md' }) {
  const sizes = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-10 h-10 text-xl',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-4xl'
  }

  return (
    <Link to="/" className="flex items-center gap-2">
      <div className={`${sizes[size]} bg-[#01c38e] rounded-xl flex items-center justify-center`}>
        <span className="text-[#1a1e29] font-bold">&lt;/&gt;</span>
      </div>
      {size !== 'sm' && (
        <span className={`font-bold text-white ${size === 'lg' ? 'text-2xl' : size === 'xl' ? 'text-3xl' : 'text-xl'}`}>
          DevDB
        </span>
      )}
    </Link>
  )
}

export default Logo