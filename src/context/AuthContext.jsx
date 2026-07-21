import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("kc_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("kc_profile");
    return saved ? JSON.parse(saved) : null;
  });
  const [switchableProfiles, setSwitchableProfiles] = useState(() => {
    const saved = localStorage.getItem("kc_switchable_profiles");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("kc_token")));

  useEffect(() => {
    const token = localStorage.getItem("kc_token");
    if (!token) return;

    api
      .get("/auth/me")
      .then(({ data }) => {
        const normalizedUser = {
          ...data.user,
          role: data.user.role?.toLowerCase()
        };
        setUser(normalizedUser);
        setProfile(data.profile);
        setSwitchableProfiles(data.switchableProfiles || []);
        localStorage.setItem("kc_user", JSON.stringify(normalizedUser));
        localStorage.setItem("kc_profile", JSON.stringify(data.profile));
        localStorage.setItem("kc_switchable_profiles", JSON.stringify(data.switchableProfiles || []));
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    const normalizedUser = {
      ...data.user,
      role: data.role ? data.role.toLowerCase() : data.user.role?.toLowerCase()
    };
    
    localStorage.setItem("kc_token", data.token);
    localStorage.setItem("kc_user", JSON.stringify(normalizedUser));
    localStorage.setItem("kc_profile", JSON.stringify(data.profile));
    localStorage.setItem("kc_switchable_profiles", JSON.stringify(data.switchableProfiles || []));
    setUser(normalizedUser);
    setProfile(data.profile);
    setSwitchableProfiles(data.switchableProfiles || []);
    return normalizedUser;
  };

  const switchProfile = async (targetUserId) => {
    const { data } = await api.post("/auth/switch-profile", { targetUserId });
    const normalizedUser = {
      ...data.role ? { ...data.user, role: data.role.toLowerCase() } : { ...data.user, role: data.user.role?.toLowerCase() }
    };
    
    localStorage.setItem("kc_token", data.token);
    localStorage.setItem("kc_user", JSON.stringify(normalizedUser));
    localStorage.setItem("kc_profile", JSON.stringify(data.profile));
    localStorage.setItem("kc_switchable_profiles", JSON.stringify(data.switchableProfiles || []));
    setUser(normalizedUser);
    setProfile(data.profile);
    setSwitchableProfiles(data.switchableProfiles || []);
    
    window.location.href = "/";
    return normalizedUser;
  };

  const logout = () => {
    api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("kc_token");
    localStorage.removeItem("kc_user");
    localStorage.removeItem("kc_profile");
    localStorage.removeItem("kc_switchable_profiles");
    setUser(null);
    setProfile(null);
    setSwitchableProfiles([]);
  };

  const value = useMemo(
    () => ({ 
      user, 
      profile, 
      switchableProfiles, 
      loading, 
      login, 
      logout, 
      switchProfile, 
      isAuthenticated: Boolean(user) 
    }),
    [user, profile, switchableProfiles, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
