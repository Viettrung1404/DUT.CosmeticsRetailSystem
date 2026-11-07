"use client";

import { MapPin, Plus, Edit2, Trash2 } from 'lucide-react';

export default function AccountAddresses() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Saved Addresses</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your delivery and billing addresses.</p>
        </div>
        <button className="flex items-center justify-center gap-2 rounded-full bg-text-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-rose hover:shadow-md">
          <Plus className="h-4 w-4" /> Add New Address
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Default Address */}
        <div className="rounded-2xl border-2 border-primary-rose bg-surface p-6 relative group transition hover:shadow-md">
          <span className="absolute top-4 right-4 bg-primary-rose text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full shadow-sm">
            Default
          </span>
          
          <div className="flex items-start gap-3 mb-4">
            <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-pink/20 text-primary-rose">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-text-primary text-lg">Elena Vance</p>
              <div className="mt-2 space-y-1 text-sm text-text-secondary">
                <p>482 Radiance Way, Penthouse 7B</p>
                <p>San Francisco, CA 94102</p>
                <p>United States</p>
                <p className="pt-2 font-medium text-text-primary">+1 (415) 890-4412</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 border-t border-nude/40 pt-4">
            <button className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-primary-rose transition">
              <Edit2 className="h-4 w-4" /> Edit
            </button>
          </div>
        </div>

        {/* Secondary Address */}
        <div className="rounded-2xl border border-nude/40 bg-surface p-6 relative group transition hover:border-primary-rose/50 hover:shadow-md">
          <div className="flex items-start gap-3 mb-4">
            <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-nude/30 text-text-secondary">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-text-primary text-lg">Elena Vance (Office)</p>
              <div className="mt-2 space-y-1 text-sm text-text-secondary">
                <p>100 Vogue Blvd, Suite 400</p>
                <p>Los Angeles, CA 90015</p>
                <p>United States</p>
                <p className="pt-2 font-medium text-text-primary">+1 (415) 890-4412</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-6 border-t border-nude/40 pt-4">
            <button className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-primary-rose transition">
              <Edit2 className="h-4 w-4" /> Edit
            </button>
            <button className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-status-danger transition">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
            <button className="ml-auto text-xs font-semibold text-primary-rose hover:underline">
              Set as Default
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}