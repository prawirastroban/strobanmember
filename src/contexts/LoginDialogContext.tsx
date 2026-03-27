import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface LoginDialogContextType {
  isOpen: boolean;
  redirectPath: string | null;
  openLoginDialog: (redirectPath?: string) => void;
  closeLoginDialog: () => void;
}

const LoginDialogContext = createContext<LoginDialogContextType | undefined>(undefined);

export function LoginDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  const openLoginDialog = useCallback((path?: string) => {
    setRedirectPath(path || null);
    setIsOpen(true);
  }, []);

  const closeLoginDialog = useCallback(() => {
    setIsOpen(false);
    setRedirectPath(null);
  }, []);

  return (
    <LoginDialogContext.Provider value={{ isOpen, redirectPath, openLoginDialog, closeLoginDialog }}>
      {children}
    </LoginDialogContext.Provider>
  );
}

export function useLoginDialog() {
  const context = useContext(LoginDialogContext);
  if (context === undefined) {
    throw new Error("useLoginDialog must be used within a LoginDialogProvider");
  }
  return context;
}
