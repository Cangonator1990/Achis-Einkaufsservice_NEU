import { ReactNode, useEffect } from "react";
import Header from "@/components/Header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { user } = useAuth();
  
  // Nach dem Rendern der Komponente nach oben scrollen
  useEffect(() => {
    // Sofort nach oben scrollen
    window.scrollTo({
      top: 0, 
      behavior: 'auto' // instant statt smooth für bessere Benutzererfahrung
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
