import { API_URL } from "app"; // Importar API_URL
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FcGoogle } from "react-icons/fc"; // Icono de Google más atractivo

// Ajusta la ruta según la estructura real de tu proyecto
import { firebaseAuth } from "../app/auth/firebase"; 
import { config } from "../app/auth/config"; // <--- NUEVA LÍNEA DE IMPORT 
import { 
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

export default function Login() {
  // NUEVA LÍNEA PARA DEPURACIÓN:
  console.log("Firebase Config in Login.tsx:", JSON.stringify(config.firebaseConfig, null, 2));

  const navigate = useNavigate();
  const location = useLocation();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getRedirectUrl = () => {
    const params = new URLSearchParams(location.search);
    return params.get("next") || "/expensedashboardpage";
  };

  useEffect(() => {
    // Si el usuario ya está autenticado (por ejemplo, si navega a /login manualmente o recarga la página)
    // y hay un usuario en firebaseAuth.currentUser, redirigir.
    // Esto es un extra, el UserGuard debería manejar la mayoría de los casos de acceso directo a /login.
    if (firebaseAuth.currentUser) {
      navigate(getRedirectUrl());
    }
  }, [navigate]);

  const handleGoogleSignIn = () => {
    // No es necesario setError(null) aquí ya que la página va a redirigir.
    setIsLoading(true); // Mostrar carga mientras se redirige
    // Redirigir al endpoint del backend para el flujo de Google OAuth
    window.location.href = `${API_URL}/auth-google-api/login`;
    // El setIsLoading(false) y manejo de error ya no son necesarios aquí,
    // ya que el navegador dejará esta página.
    // El nuevo flujo manejará el login a través de FirebaseSignInPage.
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">
            ExpenseFlow
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Inicia sesión con Google para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* El divisor y el botón de Google ahora son la opción principal */}
          {/* Se puede eliminar el divisor si se prefiere un look más directo */}
          {/*
          <div className="mt-6 mb-2 relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Iniciar sesión con
              </span>
            </div>
          </div>
          */}

          <Button variant="outline" className="w-full py-6 text-lg" onClick={handleGoogleSignIn} disabled={isLoading}>
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Iniciando...
              </>
            ) : (
              <>
                <FcGoogle className="mr-3 h-6 w-6" /> 
                Continuar con Google
              </>
            )}
          </Button>

          {error && (
            <p className="mt-4 text-sm text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
