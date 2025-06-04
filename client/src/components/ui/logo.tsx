import { Link } from "wouter";

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'hero';
  color?: 'default' | 'white';
  variant?: 'image' | 'text';
}

export function Logo({ 
  size = 'medium', 
  color = 'default',
  variant = 'image'
}: LogoProps) {
  // Size classes
  const sizeClasses = {
    small: 'h-8',
    medium: 'h-12',
    large: 'h-16',
    hero: 'h-32 md:h-48' // Deutlich größer für Hero-Bereiche
  };

  const textSizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl',
    hero: 'text-4xl md:text-5xl'
  };

  if (variant === 'text') {
    return (
      <Link href="/" className="flex items-center">
        <span className={`${textSizeClasses[size]} font-bold text-primary`}>
          Achis{' '}
          <span className="text-gray-800">
            Einkaufsservice
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link href="/" className="flex items-center justify-center">
      <img 
        src="/logo.png"
        alt="Achis Einkaufservice Logo"
        className={`${sizeClasses[size]} transition-all duration-200 hover:scale-105`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          // Fallback zur Text-Version bei Ladeproblemen
          target.style.display = 'none';
          console.error('Logo konnte nicht geladen werden');
          // Zeige Text statt Bild an
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `<span class="${textSizeClasses[size]} font-bold text-primary">Achis <span class="text-gray-800">Einkaufsservice</span></span>`;
          }
        }}
      />
    </Link>
  );
}