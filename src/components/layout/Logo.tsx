import Link from 'next/link';
import { ShoppingBag } from 'lucide-react'; // Example icon

const Logo = () => {
  return (
    <Link href="/" className="flex items-center space-x-2 text-2xl font-bold text-glow-primary hover:text-glow-accent transition-all duration-300">
      <ShoppingBag className="h-8 w-8 text-primary" />
      <span className="font-headline">ZilaCart</span>
    </Link>
  );
};

export default Logo;
