
import React, { useEffect } from "react"; // Removido useState, useCallback
import { useNavigate, useLocation, Link } from "react-router-dom";
// Header ya no necesita props de autenticación
 
import { Button } from "@/components/ui/button";
import { ArrowRight, ScanLine, Edit, FileText, UploadCloud, LogIn, ListChecks } from "lucide-react";
// Ya no se necesitan UserInfo de types, ni brain para auth aquí
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Importar el hook de Firebase
import { useCurrentUser } from "../app/auth/useCurrentUser"; 

// --- Funciones de Sesión (localStorage) --- YA NO SON NECESARIAS AQUÍ
// --- Fin Funciones de Sesión ---

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center text-center h-full">
    <div className="p-3 mb-4 text-primary rounded-full bg-primary/10">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2 text-card-foreground">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Usar el hook de Firebase para el estado de autenticación
  const { user, loading: isLoadingAuth } = useCurrentUser(); 
  const isAuthenticated = !!user;

  useEffect(() => {
    // Si el usuario está autenticado y está en la página de inicio, redirigir al dashboard
    if (isAuthenticated && location.pathname === "/") {
      console.log("Firebase Auth: User authenticated on landing, redirecting to /expensedashboardpage");
      navigate("/expensedashboardpage", { replace: true });
    }
    // No es necesario limpiar el session_id de la URL aquí,
    // ya que la página de callback de Firebase (/login o una específica) debería manejarlo.
  }, [isAuthenticated, location.pathname, navigate]);

  const handleAuthAction = () => { // Ya no necesita ser async
    if (isAuthenticated) {
      console.log("Navigating to dashboard");
      navigate("/expensedashboardpage");
    } else {
      // Navegar a la página de login de la extensión
      console.log("App.tsx: Navigating to /login page for Google Sign In");
      navigate("/login");
    }
  };

  if (isLoadingAuth && location.pathname === '/') { 
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-semibold">Cargando ExpenseFlow</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Progress value={50} className="w-3/4 mb-4" /> 
            <p className="text-gray-600">Verificando estado de autenticación...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-background to-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-primary mb-6">
              Gestión de Gastos Sencilla y Eficaz.
            </h1>
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground mb-10">
              ExpenseFlow te ayuda a capturar, organizar y validar tus gastos fácilmente, integrándose perfectamente en tu flujo de trabajo.
              Desde el escaneo OCR de tickets hasta exportaciones personalizables y almacenamiento en Google Drive.
            </p>
            {/* Solo mostrar el botón de acción si no está cargando y el usuario no está autenticado en la página de inicio,
                o si está autenticado para ir al dashboard */}
            {(!isLoadingAuth || isAuthenticated) && (
                <Button size="lg" className="text-lg px-8 py-6 rounded-full group" onClick={handleAuthAction}>
                {isAuthenticated ? "Ir al Panel" : "Iniciar sesión con Google"}
                {isAuthenticated ? <ListChecks className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /> : <LogIn className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />}
                </Button>
            )}
          </div>
        </section>

        {/* Features Section (sin cambios) */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4">
                Streamline Your Expense Workflow
              </h2>
              <p className="max-w-xl mx-auto text-md text-muted-foreground">
                Descubre potentes funcionalidades diseñadas para profesionales y equipos pequeños.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
              <FeatureCard
                icon={<ScanLine size={32} />}
                title="Escaneo Inteligente de Tickets"
                description="Captura recibos con tu cámara. Nuestro OCR extrae los detalles automáticamente, ahorrándote tiempo."
              />
              <FeatureCard
                icon={<Edit size={32} />}
                title="Hojas de Gasto Flexibles"
                description="Crea y gestiona múltiples hojas de gasto por mes, divisa o tipo de pago. Incluye flujos de validación opcionales."
              />
              <FeatureCard
                icon={<UploadCloud size={32} />}
                title="Sincronización con Google Drive"
                description="Almacena de forma segura todas las imágenes de tus tickets en tu Google Drive, organizadas por hojas de gasto."
              />
              <FeatureCard
                icon={<FileText size={32} />}
                title="Exportaciones Personalizables"
                description="Exporta los datos de tus gastos a Excel con tus propias plantillas o diseña formatos sobre la marcha."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-border/50 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ExpenseFlow. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
