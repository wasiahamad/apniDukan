import { Button } from "@/components/ui/button";
import { Facebook, Loader2 } from "lucide-react";

type SocialAuthButtonsProps = {
  loadingProvider: "google" | "facebook" | null;
  onGoogle: () => void;
  onFacebook: () => void;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.5S6.9 20.7 12 20.7c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.9-.1-1.2H12Z"/>
    </svg>
  );
}

export default function SocialAuthButtons({ loadingProvider, onGoogle, onFacebook }: SocialAuthButtonsProps) {
  const loading = Boolean(loadingProvider);

  return (
    <div className="space-y-3">
      <div className="relative text-center text-[11px] tracking-[0.2em] text-slate-500">
        <span className="px-3 bg-white/70 relative z-10">OR CONTINUE WITH</span>
        <span className="absolute left-0 right-0 top-1/2 border-t border-slate-200" />
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={onGoogle}
        className="h-12 w-full rounded-full bg-white border-slate-200 text-slate-700 hover:bg-slate-50 justify-start px-4"
      >
        {loadingProvider === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        <span className="ml-3">Continue with Google</span>
      </Button>

      <Button
        type="button"
        disabled={loading}
        onClick={onFacebook}
        className="h-12 w-full rounded-full bg-[#1877F2] hover:bg-[#1665cf] text-white justify-start px-4"
      >
        {loadingProvider === "facebook" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
        <span className="ml-3">Continue with Facebook</span>
      </Button>
    </div>
  );
}
