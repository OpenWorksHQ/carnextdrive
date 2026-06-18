import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function Success() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "error">(
    sessionId ? "loading" : "paid", // if no session_id, show generic success
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Poll Stripe via our backend to verify the session actually paid.
  // Stops after 8 attempts (~16s).
  useEffect(() => {
    if (!sessionId) return;
    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      attempts++;
      try {
        const r = await fetch(`/api/checkout-status/${sessionId}`);
        if (!r.ok) throw new Error(`Status ${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        if (
          data.payment_status === "paid" ||
          data.payment_status === "no_payment_required" ||
          data.status === "complete"
        ) {
          setStatus("paid");
          // Wipe any saved signup form data — booking is done.
          try {
            window.localStorage.removeItem("carnextdrive:signup-form");
          } catch {
            // localStorage unavailable — ignore
          }
          // Trigger server-side application email (Formspree) as a fallback
          // in case the Stripe webhook isn't configured yet. The server
          // de-duplicates by sessionId so this is safe to call here even
          // when the webhook also fires.
          fetch(`/api/notify/${sessionId}`, { method: "POST" })
            .then((r) => r.json())
            .then((j) => console.log("[notify] response:", j))
            .catch((e) => console.warn("[notify] failed:", e));
          return;
        }
        if (data.status === "expired") {
          setStatus("error");
          setErrorMsg("This checkout session expired. Please try again.");
          return;
        }
        if (attempts >= 8) {
          setStatus("pending");
          return;
        }
        setTimeout(poll, 2000);
      } catch (err: any) {
        if (cancelled) return;
        if (attempts >= 8) {
          setStatus("error");
          setErrorMsg(err?.message || "Could not verify payment status.");
        } else {
          setTimeout(poll, 2000);
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-2xl mx-auto px-6 sm:px-12 py-20 text-center">
        {status === "loading" && (
          <div data-testid="success-loading">
            <Loader2 className="w-16 h-16 text-accent mx-auto mb-6 animate-spin" />
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Confirming your payment…
            </h1>
            <p className="text-foreground/70">
              Hang tight — this only takes a few seconds.
            </p>
          </div>
        )}

        {status === "paid" && (
          <div data-testid="success-paid">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6 mx-auto">
              <CheckCircle2 className="w-12 h-12 text-accent" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Application and payment submitted
            </h1>
            <p className="text-lg text-foreground/70 mb-8">
              We will review your application and email pickup details if
              approved.
            </p>
            <Link to="/">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 py-3">
                Back to Home
              </Button>
            </Link>
          </div>
        )}

        {status === "pending" && (
          <div data-testid="success-pending">
            <Loader2 className="w-16 h-16 text-accent mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Your payment is still processing
            </h1>
            <p className="text-foreground/70 mb-6">
              We'll email you a confirmation as soon as it completes.
            </p>
            <Link to="/">
              <Button className="bg-foreground hover:bg-foreground/90 text-white">
                Back to Home
              </Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div data-testid="success-error">
            <h1 className="text-2xl font-bold text-foreground mb-3">
              We couldn't verify your payment
            </h1>
            <p className="text-red-600 mb-6">{errorMsg}</p>
            <Link to="/">
              <Button className="bg-foreground hover:bg-foreground/90 text-white">
                Back to Home
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
