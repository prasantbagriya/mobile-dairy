import { useI18n } from '../lib/i18n';
import { Mail, MessageSquare, Phone, Globe, Twitter, Instagram, Facebook, Youtube, Linkedin, Info } from 'lucide-react';
import InfoTooltip from '../components/InfoTooltip';

export default function HelpSupport() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl text-slate-900 tracking-tight flex items-center gap-2">
          Help & Support
          <InfoTooltip text="Contact customer care or follow us on social media." />
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Contact Customer Care
          </h3>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Need help with your app? Our support team is available 24/7. Reach out to us via any of the channels below.
          </p>

          <div className="space-y-3">
            <a href="tel:+917877217768" className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 transition-colors group">
              <div className="bg-blue-100 p-2 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Call Us</p>
                <p className="text-[10px] text-slate-500 tracking-widest uppercase">Mon-Sat, 9AM - 6PM</p>
              </div>
            </a>

            <a href="https://wa.me/917877217768" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-100 transition-colors group">
              <div className="bg-emerald-100 p-2 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">WhatsApp Support</p>
                <p className="text-[10px] text-slate-500 tracking-widest uppercase">Instant Replies</p>
              </div>
            </a>

            <a href="mailto:support@chatwizs.com" className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-amber-50 border border-slate-100 transition-colors group">
              <div className="bg-amber-100 p-2 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Email Us</p>
                <p className="text-[10px] text-slate-500 tracking-widest uppercase">support@chatwizs.com</p>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Connect With Us
          </h3>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Follow our social media channels for updates, tips, and community news.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <a href="https://www.linkedin.com/in/prasantbagriya/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-[#0077b5]/10 hover:text-[#0077b5] border border-slate-100 transition-colors text-slate-600">
              <Linkedin className="w-6 h-6 mb-2" />
              <span className="text-xs font-semibold">LinkedIn</span>
            </a>
            <a href="https://www.instagram.com/prasantbagriya/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-[#E1306C]/10 hover:text-[#E1306C] border border-slate-100 transition-colors text-slate-600">
              <Instagram className="w-6 h-6 mb-2" />
              <span className="text-xs font-semibold">Instagram</span>
            </a>
            <a href="https://www.facebook.com/prasantbagariya" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-[#1877F2]/10 hover:text-[#1877F2] border border-slate-100 transition-colors text-slate-600">
              <Facebook className="w-6 h-6 mb-2" />
              <span className="text-xs font-semibold">Facebook</span>
            </a>
            <a href="https://www.youtube.com/@prasantbagriya" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-[#FF0000]/10 hover:text-[#FF0000] border border-slate-100 transition-colors text-slate-600">
              <Youtube className="w-6 h-6 mb-2" />
              <span className="text-xs font-semibold">YouTube</span>
            </a>
            <a href="https://chatwizs.com/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-200 border border-slate-100 transition-colors text-slate-600 col-span-2">
              <Globe className="w-6 h-6 mb-2" />
              <span className="text-xs font-semibold">Website</span>
            </a>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
             <h4 className="text-sm font-bold text-slate-900 mb-2">Send us a message</h4>
             <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); }}>
                <input type="text" placeholder="Your Name" required className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                <textarea placeholder="How can we help?" required rows={3} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"></textarea>
                <button type="submit" className="w-full bg-slate-900 text-white py-2 text-sm font-bold hover:bg-black transition-colors">Submit Request</button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
}
