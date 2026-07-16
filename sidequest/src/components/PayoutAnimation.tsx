import { useEffect, useState } from "react";

interface PayoutAnimationProps {
  amount: number;
  upiId: string;
  onClose: () => void;
}

export function PayoutAnimation({ amount, upiId, onClose }: PayoutAnimationProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 500);
    const t2 = setTimeout(() => setStep(2), 1500);
    const t3 = setTimeout(() => setStep(3), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-xl border border-quest-xp/30 bg-card p-8 text-center space-y-4 glow-primary">
        {step < 2 ? (
          <>
            <div className="text-5xl animate-bounce">💸</div>
            <p className="font-heading text-lg text-foreground">Processing Payout...</p>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-quest-xp rounded-full transition-all duration-1000"
                style={{ width: step >= 1 ? "100%" : "30%" }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="text-6xl">🎉</div>
            <h3 className="font-heading text-2xl font-bold text-quest-xp">
              ₹{amount} Transferred!
            </h3>
            <p className="text-sm text-muted-foreground">
              Sent to <span className="text-foreground font-semibold">{upiId}</span>
            </p>
            <p className="text-xs text-quest-xp font-heading">+10 XP Earned ⭐</p>
            {step >= 3 && (
              <button
                onClick={onClose}
                className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
