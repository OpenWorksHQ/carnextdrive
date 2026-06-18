import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                <span className="text-accent">CarNext</span>
                <span className="text-foreground">Drive</span>
              </span>
            </Link>
          </div>

          {/* Menu items */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-foreground hover:text-accent transition-colors font-medium"
            >
              Available Cars
            </Link>
            <a
              href="#how-it-works"
              className="text-foreground hover:text-accent transition-colors font-medium"
            >
              How it Works
            </a>
            <a
              href="#faq"
              className="text-foreground hover:text-accent transition-colors font-medium"
            >
              FAQ
            </a>
            <Link
              to="/dashboard"
              className="text-foreground hover:text-accent transition-colors font-medium"
            >
              My Account
            </Link>
          </div>

          {/* Get Started button */}
          <div className="flex items-center gap-4">
            <Link to="/signup">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
