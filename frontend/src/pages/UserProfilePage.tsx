import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserGuardContext } from "app"; 
import { doc, getDoc, setDoc } from "firebase/firestore"; // updateDoc no se usa actualmente
import { updateProfile } from "firebase/auth";
import { firebaseDb, firebaseAuth } from "../app/auth/firebase"; 
import brain from "../brain"; // Importar el cliente brain
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function UserProfilePage() {
  const { user } = useUserGuardContext(); 
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user && user.uid) { 
      setEmail(user.email || "");
      const fetchProfile = async () => {
        setIsFetching(true);
        const profileDocRef = doc(firebaseDb, "user_profiles", user.uid);
        try {
          const docSnap = await getDoc(profileDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFirstName(data.firstName || "");
            setLastName(data.lastName || "");
          } else {
            if (user.displayName) {
                const nameParts = user.displayName.split(" ") || [];
                if (nameParts.length > 0) setFirstName(nameParts[0]);
                if (nameParts.length > 1) setLastName(nameParts.slice(1).join(" "));
            }
          }
        } catch (error) {
          console.error("Error fetching user profile from Firestore:", error);
          toast.error("Error al cargar el perfil.");
        } finally {
          setIsFetching(false);
        }
      };
      fetchProfile();
    } else if (user && !user.uid) {
        console.error("User object exists but UID is missing.");
        toast.error("Error de usuario: Falta UID.");
        setIsFetching(false);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.uid) {
        toast.error("No se puede actualizar el perfil: Usuario no identificado.");
        return;
    }
    if (!firstName || !lastName) {
        toast.warn("Nombre y Apellido son obligatorios.");
        return;
    }
    setIsLoading(true);
    const profileDocRef = doc(firebaseDb, "user_profiles", user.uid);
    const newDisplayName = `${firstName} ${lastName}`.trim();

    try {
      await setDoc(profileDocRef, {
        firstName,
        lastName,
        email: user.email, 
      }, { merge: true });

      if (firebaseAuth.currentUser && firebaseAuth.currentUser.displayName !== newDisplayName) {
          await updateProfile(firebaseAuth.currentUser, {
            displayName: newDisplayName,
          });
      }
      
      toast.success("Perfil actualizado correctamente.");
    } catch (error) {
      console.error("Error updating user profile:", error);
      toast.error("Error al actualizar el perfil.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.uid) {
      toast.error("Usuario no identificado para la eliminación.");
      return;
    }
    setIsDeleting(true);
    try {
      // El nombre del método en brain podría variar según la generación del cliente OpenAPI
      // Asumimos que el endpoint se llama 'request_deletion' en el API 'user_deletion_service'
      // El cliente brain podría generarlo como brain.user_deletion_service_request_deletion() o similar.
      // Por el momento, usare el que esta en la documentacion de los metodos del cliente de brain.
      const response = await brain.request_account_deletion(); 

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Tu solicitud de baja ha sido procesada. Serás desconectado.");
        await firebaseAuth.signOut();
        navigate("/login"); // Redirigir a la página de login o a la home "/"
      } else {
        let errorDetail = "Error al procesar la solicitud de baja.";
        try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorDetail;
        } catch (jsonError) {
            console.error("Could not parse error response JSON:", jsonError);
        }
        toast.error(errorDetail);
      }
    } catch (error) {
      console.error("Error en la solicitud de eliminación de cuenta:", error);
      toast.error("Error de red o inesperado al solicitar la baja de la cuenta.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isFetching) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-theme(space.24))]">
        <p>Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex justify-center">
      <Card className="w-full max-w-lg mt-10">
        <CardHeader>
          <CardTitle>Mi Perfil</CardTitle>
          <CardDescription>Actualiza tu información personal. Los campos marcados con <span className="text-red-500">*</span> son obligatorios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre <span className="text-red-500">*</span></Label>
              <Input 
                id="firstName" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                placeholder="Tu nombre"
                disabled={isLoading || isDeleting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellidos <span className="text-red-500">*</span></Label>
              <Input 
                id="lastName" 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                placeholder="Tus apellidos"
                disabled={isLoading || isDeleting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                disabled 
                className="bg-muted/50"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isDeleting}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-start pt-6 mt-6 border-t">
            <h3 className="text-lg font-semibold text-destructive mb-2">Zona de Peligro</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting || isLoading}>
                    {isDeleting ? "Procesando Baja..." : "Darse de Baja"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción es irreversible. Se eliminará tu acceso inmediatamente y tus datos personales 
                    (perfil, hojas de gasto, etc.) serán programados para su eliminación completa en un plazo de 7 a 10 días. 
                    Tu dirección de correo electrónico quedará registrada como que solicitaste la baja.
                    <br/><br/>
                    No podrás recuperar tu acceso ni tus datos una vez confirmada esta acción.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isDeleting ? "Eliminando..." : "Sí, eliminar mi cuenta"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-sm text-muted-foreground mt-2">
                Al confirmar, tu cuenta será eliminada permanentemente.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
