import { FacebookIcon, GoogleIcon } from "@/components/auth/BrandIcons";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type SocialAuthButtonsProps = {
  loadingProvider: "google" | "facebook" | null;
  onGoogle: () => void;
  onFacebook: () => void;
};

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
        {loadingProvider === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
        <span className="ml-3">Continue with Google</span>
      </Button>

      <Button
        type="button"
        disabled={loading}
        onClick={onFacebook}
        variant="outline"
        className="h-12 w-full rounded-full bg-white border-[#1877F2]/30 text-slate-700 hover:bg-[#1877F2]/5 justify-start px-4"
      >
        {loadingProvider === "facebook" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FacebookIcon className="h-4 w-4 text-[#1877F2]" />
        )}
        <span className="ml-3">Continue with Facebook</span>
      </Button>
    </div>
  );
}
