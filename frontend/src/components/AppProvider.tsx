import type { ReactNode } from "react";
import Header from "components/Header"; // Import the Header component

interface Props {
  children: ReactNode;
}

/**
 * A provider wrapping the whole app.
 *
 * You can add multiple providers here by nesting them,
 * and they will all be applied to the app.
 *
 * Note: ThemeProvider is already included in AppWrapper.tsx and does not need to be added here.
 */
export const AppProvider = ({ children }: Props) => {
  return (
    <>
      <Header />
      {children}
    </>
  );
};