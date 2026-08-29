import type {
  ReactNode,
} from "react";

import {
  Navigate,
} from "react-router-dom";

import {
  useAuth,
} from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const {
    user,
    loading,
    profileLoading,
  } = useAuth();

  if (
    loading ||
    profileLoading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" />

          <p className="mt-4 font-bold text-slate-500">
            Preparando Listik...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}