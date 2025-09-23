import { useState, useEffect } from 'react';
import { useUserGuardContext } from '../app/auth/UserGuard'; // Adjusted path
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '../app/auth/firebase';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  isLoading: boolean;
  error: Error | null;
}

export function useUserFirestoreProfile(): UserProfile {
  const { user } = useUserGuardContext();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user && user.uid) {
      setEmail(user.email || '');
      setIsLoading(true);
      setError(null);
      const profileDocRef = doc(firebaseDb, 'user_profiles', user.uid);
      
      getDoc(profileDocRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFirstName(data.firstName || '');
            setLastName(data.lastName || '');
          } else {
            if (user.displayName) {
              const nameParts = user.displayName.split(' ') || [];
              if (nameParts.length > 0) setFirstName(nameParts[0]);
              if (nameParts.length > 1) setLastName(nameParts.slice(1).join(' '));
            }
          }
        })
        .catch((err) => {
          console.error("Error fetching user profile from Firestore:", err);
          setError(err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (user && !user.uid) {
        console.error("User object exists but UID is missing in useUserFirestoreProfile.");
        setError(new Error("User UID is missing."));
        setIsLoading(false);
    } else if (!user) {
        setIsLoading(false); // Not logged in or user context not yet available
    }
  }, [user]);

  return { firstName, lastName, email, isLoading, error };
}
