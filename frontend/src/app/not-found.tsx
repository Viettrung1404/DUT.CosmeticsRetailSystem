import Link from "next/link";
import { Search, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-background min-h-screen flex items-center justify-center py-16 px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="text-9xl font-bold text-primary-pink/20 mb-4">404</div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">Ingredient or Product Not Found</h1>
        <p className="text-text-secondary mb-8 max-w-lg mx-auto">
          We couldn&apos;t find the specific formulation or page you&apos;re looking for. It may have been discontinued or moved to our archived collections.
        </p>

        {/* Subtle Search Bar */}
        <div className="relative max-w-md mx-auto mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Search for serums, cleansers, or concerns..." 
            className="w-full rounded-full border border-nude/60 bg-surface pl-12 pr-4 py-4 text-sm outline-none focus:border-primary-rose focus:ring-1 focus:ring-primary-rose transition"
          />
        </div>

        {/* Helpful Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/shop" className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-text-primary px-8 py-3 text-sm font-bold text-white hover:bg-primary-rose transition">
            <ArrowLeft className="h-4 w-4" /> Back to Collections
          </Link>
          <Link href="/" className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full border border-nude/60 bg-surface px-8 py-3 text-sm font-bold text-text-primary hover:bg-nude/20 transition">
            <Home className="h-4 w-4" /> Return Home
          </Link>
        </div>

        {/* Suggestions */}
        <div className="mt-16 pt-12 border-t border-nude/30 text-left">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6 text-center">Recommended For You</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Peptide Serums', 'Ceramide Creams', 'Lip Oils', 'Sunscreen'].map((term) => (
              <Link key={term} href={`/shop?q=${term.toLowerCase()}`} className="block p-4 rounded-xl border border-nude/40 bg-surface text-center text-sm font-medium text-text-secondary hover:border-primary-rose hover:text-primary-rose transition">
                {term}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
