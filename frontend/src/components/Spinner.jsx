function Spinner({ size = 'md' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3'
  };

  return (
    <div
      className={`${sizes[size]} border-gray-300 border-t-[#01c38e] rounded-full animate-spin inline-block`}
    />
  );
}

export default Spinner;