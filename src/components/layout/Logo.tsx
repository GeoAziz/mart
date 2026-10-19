import Link from 'next/link';
import Image from 'next/image';

const Logo = () => {
  return (
    <Link href="/" className="flex items-center space-x-2.5 text-2xl font-bold text-glow-primary hover:text-glow-accent transition-all duration-300 group">
      <div className="relative h-9 w-9 rounded-lg overflow-hidden border border-primary/30 shadow-sm group-hover:border-accent/60 transition-colors">
        <Image
          src="/images/logo.jpg"
          alt="ZilaCart Logo"
          fill
          sizes="36px"
          className="object-cover"
          priority
        />
      </div>
      <span className="font-headline tracking-tight">ZilaCart</span>
    </Link>
  );
};

export default Logo;

