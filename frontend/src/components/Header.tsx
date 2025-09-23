import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { firebaseAuth, useCurrentUser } from "app"; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User as UserIcon, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

export default function Header() {
  const { user, loading } = useCurrentUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await firebaseAuth.signOut();
      toast.success("Sesión cerrada correctamente.");
      navigate("/"); 
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast.error("Error al cerrar sesión.");
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "";
    const names = name.split(" ");
    const initials = names.map((n) => n[0]).join("");
    return initials.toUpperCase();
  };

  return (
    <header className="bg-card shadow-sm sticky top-0 z-50 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <Link to={user ? "/expensedashboardpage" : "/"} className="text-xl font-bold text-primary">
            ExpenseFlow
            </Link>
            {user && (
                <Button
                    variant="ghost"
                    onClick={() => navigate("/expensedashboardpage")}
                    className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium"
                >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                </Button>
            )}
        </div>
        <nav className="flex items-center space-x-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    {user.photoURL ? (
                      <AvatarImage src={user.photoURL} alt={user.displayName || user.email || "User"} />
                    ) : null}
                    <AvatarFallback>
                      {user.displayName 
                        ? getInitials(user.displayName) 
                        : <UserIcon className="h-5 w-5 text-muted-foreground" />
                      }
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.displayName || "Usuario"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/userprofilepage")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Mi Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Iniciar Sesión</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
