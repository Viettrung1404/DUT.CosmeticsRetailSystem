import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Search } from "lucide-react";

export default function BrandsPage() {
  const featuredBrands = [
    { id: "lumina", name: "Lumina", logo: "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=300&q=80", bg: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80" },
    { id: "aura", name: "Aura Botanica", logo: "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=300&q=80", bg: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80" },
    { id: "velvet", name: "Velvet Skin", logo: "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=300&q=80", bg: "https://images.unsplash.com/photo-1615397323759-00dc6b65363f?w=800&q=80" },
  ];

  const allBrands = [
    { letter: "A", brands: ["Aesop", "Aura Botanica", "Augustinus Bader"] },
    { letter: "B", brands: ["Byredo", "Biossance", "Beauty of Joseon"] },
    { letter: "C", brands: ["Chanel", "Charlotte Tilbury", "Caudalie"] },
    { letter: "D", brands: ["Drunk Elephant", "Dior Beauty", "Dr. Jart+"] },
    { letter: "G", brands: ["Glow Recipe", "Gucci Beauty", "Guerlain"] },
    { letter: "L", brands: ["La Mer", "Laneige", "Lumina"] },
    { letter: "O", brands: ["Olaplex", "Ouai", "Osea"] },
    { letter: "R", brands: ["Rare Beauty", "Rhode", "Rose Inc"] },
  ];

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[40vh] md:h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-primary-rose/5 z-10"></div>
        <Image 
          src="https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=2000&q=80" 
          alt="Brands" 
          fill 
          className="object-cover opacity-60" 
        />
        <div className="relative z-20 text-center px-4 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-text-primary tracking-tight mb-4">
            Curated Houses of Beauty
          </h1>
          <p className="text-lg text-text-secondary">
            Discover our meticulously selected portfolio of the world's most prestigious skincare and cosmetic brands.
          </p>
        </div>
      </section>

      {/* Featured Brands */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <h2 className="text-3xl font-bold text-text-primary">Featured Houses</h2>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
            <input 
              type="text" 
              placeholder="Search brands..." 
              className="w-full rounded-full border border-nude/60 bg-surface py-3 pl-12 pr-4 text-sm outline-none focus:border-primary-rose transition shadow-sm hover:shadow-md"
            />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {featuredBrands.map((brand) => (
            <Link key={brand.id} href={`/brands/${brand.id}`} className="group block relative h-96 rounded-2xl overflow-hidden">
              <Image src={brand.bg} alt={brand.name} fill className="object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full p-8 flex items-end justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">{brand.name}</h3>
                  <p className="text-white/80 text-sm mt-1">Explore Collection</p>
                </div>
                <span className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white group-hover:bg-primary-rose transition shadow-sm">
                  Khám phá
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Brand Directory A-Z */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-nude/40">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold text-text-primary">Brand Directory</h2>
        </div>

        {/* Alphabet Navigation */}
        <div className="flex flex-wrap gap-2 mb-12">
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("").map(letter => (
            <button key={letter} className="w-10 h-10 rounded-full text-sm font-semibold flex items-center justify-center transition hover:bg-primary-rose hover:text-white text-text-secondary bg-surface border border-nude/40">
              {letter}
            </button>
          ))}
        </div>

        {/* Directory Listing */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {allBrands.map((group) => (
            <div key={group.letter}>
              <h3 className="text-2xl font-bold text-primary-rose mb-4 border-b border-nude/40 pb-2">{group.letter}</h3>
              <ul className="space-y-3">
                {group.brands.map(brand => (
                  <li key={brand}>
                    <Link href={`/brands/${brand.toLowerCase().replace(/ /g, '-')}`} className="text-text-secondary hover:text-text-primary hover:translate-x-1 inline-block transition">
                      {brand}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
