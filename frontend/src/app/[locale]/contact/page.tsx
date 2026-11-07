import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="bg-background min-h-screen py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-text-primary text-center mb-4">Get in Touch</h1>
        <p className="text-text-secondary text-center max-w-2xl mx-auto mb-16">
          Whether you need personalized skincare advice, have a question about an order, or just want to say hello, our concierge team is here for you.
        </p>

        <div className="grid md:grid-cols-2 gap-16">
          <div className="bg-surface p-10 rounded-3xl border border-nude/40 shadow-sm">
            <h2 className="text-2xl font-bold text-text-primary mb-8">Send us a Message</h2>
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">First Name</label>
                  <input type="text" className="w-full rounded-xl border border-nude/60 bg-background py-3 px-4 outline-none focus:border-primary-rose" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Last Name</label>
                  <input type="text" className="w-full rounded-xl border border-nude/60 bg-background py-3 px-4 outline-none focus:border-primary-rose" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
                <input type="email" className="w-full rounded-xl border border-nude/60 bg-background py-3 px-4 outline-none focus:border-primary-rose" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Message</label>
                <textarea rows={5} className="w-full rounded-xl border border-nude/60 bg-background py-3 px-4 outline-none focus:border-primary-rose"></textarea>
              </div>
              <button type="button" className="w-full rounded-full bg-text-primary py-4 text-sm font-bold text-white hover:bg-primary-rose transition">
                Send Message
              </button>
            </form>
          </div>

          <div className="space-y-10">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-6">Contact Information</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-pink/30 text-primary-rose rounded-full"><Mail className="h-6 w-6" /></div>
                  <div>
                    <h3 className="font-semibold text-text-primary">Email Us</h3>
                    <p className="text-text-secondary mt-1">concierge@glowup.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-pink/30 text-primary-rose rounded-full"><Phone className="h-6 w-6" /></div>
                  <div>
                    <h3 className="font-semibold text-text-primary">Call Us</h3>
                    <p className="text-text-secondary mt-1">+1 (800) 123-4567<br/>Mon-Fri, 9am - 6pm EST</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-pink/30 text-primary-rose rounded-full"><MapPin className="h-6 w-6" /></div>
                  <div>
                    <h3 className="font-semibold text-text-primary">Headquarters</h3>
                    <p className="text-text-secondary mt-1">482 Radiance Way<br/>San Francisco, CA 94102</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}