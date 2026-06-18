import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { CreditCard, FileCheck, Settings, Car } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            My Account
          </h1>
          <p className="text-lg text-foreground/70">
            Manage your rentals and account settings
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* My Rentals Card */}
          <div className="bg-white border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">My Rentals</h3>
              <Car className="w-6 h-6 text-accent" />
            </div>
            <p className="text-3xl font-bold text-accent mb-4">1</p>
            <Button className="w-full bg-foreground hover:bg-foreground/90 text-white">
              View Rentals
            </Button>
          </div>

          {/* Payment Method Card */}
          <div className="bg-white border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">
                Payment Method
              </h3>
              <CreditCard className="w-6 h-6 text-accent" />
            </div>
            <p className="text-sm text-foreground/70 mb-4">
              Visa ending in 4242
            </p>
            <Button className="w-full bg-foreground hover:bg-foreground/90 text-white">
              Update
            </Button>
          </div>

          {/* Documents Uploaded Card */}
          <div className="bg-white border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Documents</h3>
              <FileCheck className="w-6 h-6 text-accent" />
            </div>
            <p className="text-sm text-foreground/70 mb-4">All documents verified</p>
            <Button className="w-full bg-foreground hover:bg-foreground/90 text-white">
              View Documents
            </Button>
          </div>

          {/* Account Settings Card */}
          <div className="bg-white border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Settings</h3>
              <Settings className="w-6 h-6 text-accent" />
            </div>
            <p className="text-sm text-foreground/70 mb-4">
              Manage your preferences
            </p>
            <Button className="w-full bg-foreground hover:bg-foreground/90 text-white">
              Edit Settings
            </Button>
          </div>
        </div>

        {/* Active Rentals Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Active Rentals
          </h2>
          <div className="border border-border rounded-lg p-8 text-center bg-foreground/5">
            <p className="text-foreground/70 mb-4">
              No active rentals at this time
            </p>
            <Link to="/">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Browse Available Cars
              </Button>
            </Link>
          </div>
        </section>

        {/* Rental History Section */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Rental History
          </h2>
          <div className="border border-border rounded-lg p-8 text-center bg-foreground/5">
            <p className="text-foreground/70">
              Your past rentals will appear here
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
