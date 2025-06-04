import { Link as WouterLink, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import MainLayout from "@/layouts/MainLayout";
import { useEffect } from "react";

// Verbesserte Link-Komponente, die WouterLink korrekt verwendet
const Link = ({ href, className, children, ...props }: { href: string; className?: string; children: React.ReactNode; [key: string]: any }) => {
  // Bei Anker-Links innerhalb der Seite spezielles Handling
  if (href.startsWith('#')) {
    return (
      <span 
        onClick={(e) => {
          e.preventDefault();
          const element = document.getElementById(href.substring(1));
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
          }
        }}
        className={className} 
        style={{ cursor: 'pointer' }}
        {...props}
      >
        {children}
      </span>
    );
  }
  
  // Für normale Links die WouterLink-Komponente verwenden
  return (
    <WouterLink href={href} {...props}>
      <span className={className} style={{ cursor: 'pointer' }}>
        {children}
      </span>
    </WouterLink>
  );
};

const HomePage = () => {
  const { user } = useAuth();

  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-12 mb-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center mb-8">
            <Logo size="hero" />
            <h1 className="text-4xl md:text-5xl font-bold font-sans text-gray-800 mt-8 mb-4">
              Ihr persönlicher Einkaufsservice
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl">
              Wir erledigen Ihre Einkäufe, damit Sie mehr Zeit für die wichtigen Dinge im Leben haben.
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              {user ? (
                <Button asChild size="lg" className="py-6">
                  <Link href="/order">
                    Jetzt bestellen
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="py-6">
                  <Link href="/auth">
                    Jetzt bestellen
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg" className="py-6">
                <Link href="#how-it-works">
                  Mehr erfahren
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>



      {/* Features Section */}
      <div id="how-it-works" className="container mx-auto px-4 mb-16">
        <h2 className="text-3xl font-bold text-center mb-12 font-sans">So funktioniert unser Service</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 text-primary" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 font-sans">1. Bestellen Sie online</h3>
            <p className="text-gray-600">Erstellen Sie einfach Ihre Einkaufsliste mit allen benötigten Produkten.</p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 text-primary" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 font-sans">2. Wählen Sie den Liefertermin</h3>
            <p className="text-gray-600">Bestimmen Sie, wann wir Ihnen die Einkäufe liefern sollen.</p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 text-primary" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 font-sans">3. Wir liefern zu Ihnen</h3>
            <p className="text-gray-600">Lehnen Sie sich zurück - wir erledigen den Einkauf und liefern pünktlich.</p>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 font-sans">Was unsere Kunden sagen</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-4">
                <div className="text-amber-400 flex">
                  {[...Array(5)].map((_, i) => (
                    <svg 
                      key={i}
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" 
                      />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-4">"Der Service ist fantastisch! Ich spare so viel Zeit und die Produkte sind immer frisch und genau das, was ich bestellt habe."</p>
              <div className="flex items-center">
                <img 
                  src="https://randomuser.me/api/portraits/women/43.jpg" 
                  alt="Kundin" 
                  className="w-10 h-10 rounded-full mr-3" 
                />
                <div>
                  <p className="font-medium">Sabine Müller</p>
                  <p className="text-gray-500 text-sm">Stammkundin seit 2022</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-4">
                <div className="text-amber-400 flex">
                  {[...Array(5)].map((_, i) => (
                    <svg 
                      key={i}
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" 
                      />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-4">"Als berufstätige Mutter ist dieser Service ein Lebensretter. Die Lieferungen sind immer pünktlich und die Website ist super einfach zu bedienen."</p>
              <div className="flex items-center">
                <img 
                  src="https://randomuser.me/api/portraits/women/63.jpg" 
                  alt="Kundin" 
                  className="w-10 h-10 rounded-full mr-3" 
                />
                <div>
                  <p className="font-medium">Julia Weber</p>
                  <p className="text-gray-500 text-sm">Stammkundin seit 2023</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-4">
                <div className="text-amber-400 flex">
                  {[...Array(4)].map((_, i) => (
                    <svg 
                      key={i}
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" 
                      />
                    </svg>
                  ))}
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5" 
                    fill="none"
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
                    />
                  </svg>
                </div>
              </div>
              <p className="text-gray-600 mb-4">"Zuverlässiger Service mit freundlichem Personal. Die Möglichkeit, Liefertermine flexibel anzupassen, ist besonders praktisch für meinen unregelmäßigen Zeitplan."</p>
              <div className="flex items-center">
                <img 
                  src="https://randomuser.me/api/portraits/men/32.jpg" 
                  alt="Kunde" 
                  className="w-10 h-10 rounded-full mr-3" 
                />
                <div>
                  <p className="font-medium">Thomas Schneider</p>
                  <p className="text-gray-500 text-sm">Stammkunde seit 2023</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;