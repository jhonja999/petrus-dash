'use client';

import Image from 'next/image';

type LogoPetrusProps = {
  width?: number;
  height?: number;
  className?: string;
};

const LogoPetrus = ({ width = 120, height = 60, className = '' }: LogoPetrusProps) => {
  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <Image
        src="/assets/LOGO_PETRUS.webp"
        alt="Logo Petrus"
        layout="fill"
        objectFit="contain"
        priority
      />
    </div>
  );
};

export default LogoPetrus;
