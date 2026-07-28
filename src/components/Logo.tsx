export function PieLogo({ size = 26 }: { size?: number }) {
  const scale = size / 160;
  return (
    <svg width={size} height={size * 1.1875} viewBox="0 0 160 190" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <defs>
        <clipPath id={`pie-clip-${size}`}>
          <path d="M80,178 L8,60 A78,78 0 0,1 152,60 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#pie-clip-${size})`}>
        <rect width="160" height="190" fill="#C41230" />
        <rect y="20" width="160" height="24" fill="#F5EDD8" />
        <rect y="68" width="160" height="24" fill="#F5EDD8" />
        <rect y="116" width="160" height="24" fill="#F5EDD8" />
        <rect y="158" width="160" height="24" fill="#F5EDD8" />
        <path d="M80,178 L8,60 A78,78 0 0,1 80,22 L80,178 Z" fill="#001B3D" />
      </g>
      <path d="M8,60 A78,78 0 0,1 152,60" fill="none" stroke="#E8A030" strokeWidth="18" strokeLinecap="round" />
      <text x="46" y="96" fontSize="22" fill="white" fontFamily="serif" textAnchor="middle">★</text>
    </svg>
  );
}

export function CivicPieWordmark({ dark = false }: { dark?: boolean }) {
  return (
    <div>
      <div
        className="font-bold text-[22px] leading-none tracking-[-0.5px]"
        style={{ fontFamily: "'Montserrat', sans-serif", color: dark ? '#FFFFFF' : '#001B3D' }}
      >
        Civic<span style={{ color: '#C41230' }}>Pie</span>
      </div>
      <div
        className="mt-0.5 text-[7px] font-bold tracking-[2px] uppercase"
        style={{
          fontFamily: "'Montserrat', sans-serif",
          color: dark ? 'rgba(255,255,255,0.3)' : '#6B7280',
        }}
      >
        Hyperlocal Civic Engagement
      </div>
    </div>
  );
}
