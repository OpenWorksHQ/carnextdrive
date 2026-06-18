import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-accent mb-4">404</h1>
          <p className="text-2xl font-bold text-foreground mb-2">
            Page Not Found
          </p>
          <p className="text-lg text-foreground/70 mb-8">
            Sorry, the page you're looking for doesn't exist.
          </p>
          <Link to="/">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base px-8 py-3">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
