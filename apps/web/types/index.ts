// 基於 Figma 設計的類型定義

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  type: 'Villa' | 'Apartment' | 'House' | 'Condo' | 'Penthouse' | 'Studio' | 'Townhouse';
  image: string;
  featured?: boolean;
  location?: string;
  area?: number;
  amenities?: string[];
}

export interface NavigationItem {
  label: string;
  href: string;
  isActive?: boolean;
}

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export interface TextProps {
  children: React.ReactNode;
  variant?: 'heading-xl' | 'heading-lg' | 'heading-md' | 'body-lg' | 'body-md' | 'body-sm';
  color?: 'white' | 'grey-60' | 'purple-60';
  className?: string;
}

export interface IconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'grey-60' | 'purple-60';
  className?: string;
}

// 響應式斷點
export const BREAKPOINTS = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const;

// 動畫配置
export const ANIMATIONS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 },
  },
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.3 },
  },
  scaleIn: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.2 },
  },
} as const;