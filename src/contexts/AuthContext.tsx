import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type {
  User,
} from "@supabase/supabase-js";

import {
  supabase,
} from "../lib/supabase";

/*
 * ==========================================
 * PERFIL LISTIK
 * ==========================================
 */

export interface UserProfile {
  id: string;

  fullName:
    | string
    | null;

  state:
    | string
    | null;

  municipality:
    | string
    | null;

  latitude:
    | number
    | null;

  longitude:
    | number
    | null;

  onboardingCompleted: boolean;
}

/*
 * ==========================================
 * CONTEXTO
 * ==========================================
 */

interface AuthContextValue {
  user:
    | User
    | null;

  profile:
    | UserProfile
    | null;

  /*
   * Rol administrativo.
   */

  isAdmin: boolean;

  /*
   * Loading general de sesión.
   */

  loading: boolean;

  /*
   * Loading del perfil.
   */

  profileLoading: boolean;

  /*
   * Loading de verificación admin.
   */

  adminLoading: boolean;

  refreshProfile:
    () => Promise<void>;

  refreshAdminStatus:
    () => Promise<void>;

  completeOnboarding:
    () => Promise<void>;

  signOut:
    () => Promise<void>;
}

const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(
    undefined,
  );

/*
 * ==========================================
 * PROVIDER
 * ==========================================
 */

interface AuthProviderProps {
  children:
    ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  /*
   * ==========================================
   * USUARIO
   * ==========================================
   */

  const [
    user,
    setUser,
  ] =
    useState<
      User | null
    >(
      null,
    );

  /*
   * ==========================================
   * PERFIL
   * ==========================================
   */

  const [
    profile,
    setProfile,
  ] =
    useState<
      UserProfile | null
    >(
      null,
    );

  /*
   * ==========================================
   * ADMIN
   * ==========================================
   */

  const [
    isAdmin,
    setIsAdmin,
  ] =
    useState(
      false,
    );

  /*
   * ==========================================
   * LOADINGS
   * ==========================================
   */

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    profileLoading,
    setProfileLoading,
  ] =
    useState(
      false,
    );

  const [
    adminLoading,
    setAdminLoading,
  ] =
    useState(
      false,
    );

  /*
   * ==========================================
   * CARGAR PERFIL
   * ==========================================
   */

  async function loadProfile(
    userId: string,
  ) {
    try {
      setProfileLoading(
        true,
      );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "profiles",
          )
          .select(`
            id,
            full_name,
            state,
            municipality,
            latitude,
            longitude,
            onboarding_completed
          `)
          .eq(
            "id",
            userId,
          )
          .maybeSingle();

      if (
        error
      ) {
        console.error(
          "Error cargando perfil:",
          error,
        );

        setProfile(
          null,
        );

        return;
      }

      if (
        !data
      ) {
        setProfile(
          null,
        );

        return;
      }

      setProfile({
        id:
          String(
            data.id,
          ),

        fullName:
          data.full_name ??
          null,

        state:
          data.state ??
          null,

        municipality:
          data.municipality ??
          null,

        latitude:
          data.latitude ??
          null,

        longitude:
          data.longitude ??
          null,

        onboardingCompleted:
          data.onboarding_completed ===
          true,
      });
    } catch (
      error
    ) {
      console.error(
        "Error inesperado cargando perfil:",
        error,
      );

      setProfile(
        null,
      );
    } finally {
      setProfileLoading(
        false,
      );
    }
  }

  /*
   * ==========================================
   * CARGAR ESTADO ADMIN
   * ==========================================
   *
   * Si existe una fila en admin_users
   * con el UUID del usuario, es administrador.
   */

  async function loadAdminStatus(
    userId: string,
  ) {
    try {
      setAdminLoading(
        true,
      );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "admin_users",
          )
          .select(
            "user_id",
          )
          .eq(
            "user_id",
            userId,
          )
          .maybeSingle();

      if (
        error
      ) {
        console.error(
          "Error verificando administrador:",
          error,
        );

        setIsAdmin(
          false,
        );

        return;
      }

      setIsAdmin(
        Boolean(
          data,
        ),
      );
    } catch (
      error
    ) {
      console.error(
        "Error inesperado verificando administrador:",
        error,
      );

      setIsAdmin(
        false,
      );
    } finally {
      setAdminLoading(
        false,
      );
    }
  }

  /*
   * ==========================================
   * REFRESCAR PERFIL
   * ==========================================
   */

  async function refreshProfile() {
    if (
      !user
    ) {
      setProfile(
        null,
      );

      return;
    }

    await loadProfile(
      user.id,
    );
  }

  /*
   * ==========================================
   * REFRESCAR ADMIN
   * ==========================================
   */

  async function refreshAdminStatus() {
    if (
      !user
    ) {
      setIsAdmin(
        false,
      );

      return;
    }

    await loadAdminStatus(
      user.id,
    );
  }

  /*
   * ==========================================
   * COMPLETAR ONBOARDING
   * ==========================================
   */

  async function completeOnboarding() {
    if (
      !user
    ) {
      throw new Error(
        "No hay una sesión activa.",
      );
    }

    const {
      error,
    } =
      await supabase
        .from(
          "profiles",
        )
        .update({
          onboarding_completed:
            true,
        })
        .eq(
          "id",
          user.id,
        );

    if (
      error
    ) {
      console.error(
        "Error completando onboarding:",
        error,
      );

      throw error;
    }

    /*
     * Actualización local.
     */

    setProfile(
      (
        currentProfile,
      ) => {
        if (
          !currentProfile
        ) {
          return currentProfile;
        }

        return {
          ...currentProfile,

          onboardingCompleted:
            true,
        };
      },
    );
  }

  /*
   * ==========================================
   * SESIÓN INICIAL
   * ==========================================
   */

  useEffect(
    () => {
      let mounted =
        true;

      /*
       * ========================================
       * INICIALIZAR AUTH
       * ========================================
       */

      async function initializeAuth() {
        try {
          const {
            data,
            error,
          } =
            await supabase.auth.getSession();

          if (
            error
          ) {
            console.error(
              "Error obteniendo sesión:",
              error,
            );
          }

          const currentUser =
            data.session
              ?.user ??
            null;

          if (
            !mounted
          ) {
            return;
          }

          setUser(
            currentUser,
          );

          /*
           * ======================================
           * USUARIO CON SESIÓN
           * ======================================
           */

          if (
            currentUser
          ) {
            await Promise.all([
              loadProfile(
                currentUser.id,
              ),

              loadAdminStatus(
                currentUser.id,
              ),
            ]);
          }

          /*
           * ======================================
           * SIN SESIÓN
           * ======================================
           */

          else {
            setProfile(
              null,
            );

            setIsAdmin(
              false,
            );
          }
        } catch (
          error
        ) {
          console.error(
            "Error inicializando autenticación:",
            error,
          );

          if (
            mounted
          ) {
            setUser(
              null,
            );

            setProfile(
              null,
            );

            setIsAdmin(
              false,
            );
          }
        } finally {
          if (
            mounted
          ) {
            setLoading(
              false,
            );
          }
        }
      }

      void initializeAuth();

      /*
       * ========================================
       * ESCUCHAR CAMBIOS DE AUTH
       * ========================================
       */

      const {
        data:
          authListener,
      } =
        supabase.auth.onAuthStateChange(
          (
            _event,
            session,
          ) => {
            const currentUser =
              session
                ?.user ??
              null;

              console.log(
              "USUARIO ACTUAL:",
               currentUser?.id,
              currentUser?.email,
              );

            setUser(
              currentUser,
            );

            /*
             * ==================================
             * LOGIN
             * ==================================
             */

            if (
              currentUser
            ) {
              /*
               * Usamos setTimeout para evitar
               * problemas haciendo queries dentro
               * del callback de Supabase Auth.
               */

              window.setTimeout(
                () => {
                  void Promise.all([
                    loadProfile(
                      currentUser.id,
                    ),

                    loadAdminStatus(
                      currentUser.id,
                    ),
                  ]);
                },
                0,
              );
            }

            /*
             * ==================================
             * LOGOUT
             * ==================================
             */

            else {
              setProfile(
                null,
              );

              setIsAdmin(
                false,
              );

              setProfileLoading(
                false,
              );

              setAdminLoading(
                false,
              );
            }

            setLoading(
              false,
            );
          },
        );

      /*
       * ========================================
       * CLEANUP
       * ========================================
       */

      return () => {
        mounted =
          false;

        authListener
          .subscription
          .unsubscribe();
      };
    },
    [],
  );

  /*
   * ==========================================
   * CERRAR SESIÓN
   * ==========================================
   */

  async function signOut() {
    const {
      error,
    } =
      await supabase.auth.signOut();

    if (
      error
    ) {
      console.error(
        "Error cerrando sesión:",
        error,
      );

      throw error;
    }

    setUser(
      null,
    );

    setProfile(
      null,
    );

    setIsAdmin(
      false,
    );

    setProfileLoading(
      false,
    );

    setAdminLoading(
      false,
    );
  }

  /*
   * ==========================================
   * PROVIDER
   * ==========================================
   */

  return (
    <AuthContext.Provider
      value={{
        user,

        profile,

        isAdmin,

        loading,

        profileLoading,

        adminLoading,

        refreshProfile,

        refreshAdminStatus,

        completeOnboarding,

        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/*
 * ==========================================
 * HOOK
 * ==========================================
 */

export function useAuth() {
  const context =
    useContext(
      AuthContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider.",
    );
  }

  return context;
}