import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signInWithCustomToken } from "firebase/auth";
import { firebaseAuth } from "app"; // Asegúrate que firebaseAuth esté exportado desde app
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "../app/auth/useCurrentUser"; // Importar useCurrentUser

const FirebaseSignInPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isProcessingToken, setIsProcessingToken] = useState(true);
  const [attemptedSignIn, setAttemptedSignIn] = useState(false); // Para evitar re-intentos si falla la primera vez

  const { user: currentUser, loading: authLoading } = useCurrentUser(); // Usar hook

  useEffect(() => {
    const token = searchParams.get("token");
    console.log("FirebaseSignInPage: useEffect [searchParams, isProcessingToken] triggered. Token:", token, "isProcessingToken:", isProcessingToken, "attemptedSignIn:", attemptedSignIn);

    if (token && isProcessingToken && !attemptedSignIn) {
      setIsProcessingToken(true); // Asegurarse de que está en true al empezar
      setAttemptedSignIn(true); // Marcar que se intentó el signIn
      console.log("FirebaseSignInPage: Attempting signInWithCustomToken with token:", token);
      signInWithCustomToken(firebaseAuth, token)
        .then((userCredential) => {
          console.log("FirebaseSignInPage: signInWithCustomToken SUCCESSFUL for user:", userCredential.user?.uid);
          setIsProcessingToken(false); 
        })
        .catch((signInError) => {
          console.error("FirebaseSignInPage: signInWithCustomToken FAILED:", signInError);
          setError(`Error al procesar token: ${signInError.message}.`);
          setIsProcessingToken(false);
        });
    } else if (!token && isProcessingToken && !attemptedSignIn) {
      console.log("FirebaseSignInPage: No token found on initial load.");
      setError("No se proporcionó un token de autenticación.");
      setIsProcessingToken(false);
      setAttemptedSignIn(true); // También marcar como intentado para no re-evaluar esto
    }
  }, [searchParams, navigate, isProcessingToken, attemptedSignIn]);

  useEffect(() => {
    console.log("FirebaseSignInPage: useEffect [authStatus] triggered. isProcessingToken:", isProcessingToken, "authLoading:", authLoading, "currentUser:", currentUser?.uid, "error:", error);

    if (isProcessingToken) {
      console.log("FirebaseSignInPage: Still processing token, skipping navigation logic.");
      return;
    }

    if (authLoading) {
      console.log("FirebaseSignInPage: Auth state is loading, skipping navigation logic.");
      return;
    }

    // En este punto, isProcessingToken es false y authLoading es false.
    if (currentUser) {
      console.log("FirebaseSignInPage: User is authenticated globally. Navigating to dashboard.");
      navigate("/expensedashboardpage", { replace: true });
    } else {
      // Si no hay currentUser, significa que la autenticación falló o no se completó.
      console.log("FirebaseSignInPage: No authenticated user found globally after processing and auth loading.");
      if (!error) { // Si no había un error específico de signInWithCustomToken
        setError("La autenticación con Firebase no se completó. Por favor, intenta iniciar sesión de nuevo.");
      }
      // La UI de error se mostrará. El botón "Ir a Login" permitirá al usuario reintentar.
      // Considerar un timeout para redirigir a /login si se prefiere, pero el botón es más claro.
      // setTimeout(() => navigate("/login", { replace: true }), 5000); 
    }
  }, [isProcessingToken, authLoading, currentUser, navigate, error]);
  
  // UI de carga
  if (isProcessingToken || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-lg font-semibold">
          {isProcessingToken ? "Procesando token de inicio de sesión..." : "Verificando autenticación..."}
        </p>
        <p className="text-sm text-gray-600">Por favor, espera un momento.</p>
      </div>
    );
  }

  // UI de error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error de Autenticación</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <button 
          onClick={() => {
            console.log("FirebaseSignInPage: 'Ir a Login' button clicked.");
            navigate("/login", { replace: true });
          }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Ir a Login
        </button>
      </div>
    );
  }

  console.log("FirebaseSignInPage: Reached end of render, returning null. This state should ideally not be common if loading/error is handled.");
  return null; 
};

export default FirebaseSignInPage;