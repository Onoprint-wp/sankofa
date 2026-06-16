import { useEffect, useState } from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  role: "buyer" | "artist" | "admin" | "curator";
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArtistProfile {
  id: string;
  bio: string | null;
  country: string;
  city: string;
  cni_url: string | null;
  selfie_url: string | null;
  kyc_status: "pending" | "approved" | "rejected" | "unsubmitted";
  rejection_reason: string | null;
  mobile_money_phone: string | null;
  mobile_money_provider: "orange" | "mtn" | "moov" | "airtel" | null;
  rating_avg: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndArtist = async (userId: string) => {
    try {
      // Fetch user profile from public.profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(profileData as UserProfile);

      // If the role is artist, fetch specific artist info from public.artists
      if (profileData && profileData.role === "artist") {
        const { data: artistData, error: artistError } = await supabase
          .from("artists")
          .select("*")
          .eq("id", userId)
          .single();

        if (!artistError && artistData) {
          setArtist(artistData as ArtistProfile);
        } else {
          setArtist(null);
        }
      } else {
        setArtist(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setProfile(null);
      setArtist(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;

      setSession(initialSession);
      const currentUser = initialSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchProfileAndArtist(currentUser.id).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setArtist(null);
        setLoading(false);
      }
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          setLoading(true);
          await fetchProfileAndArtist(currentUser.id);
        } else {
          setProfile(null);
          setArtist(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error during sign out:", error);
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setArtist(null);
    setLoading(false);
  };

  return {
    user,
    session,
    profile,
    artist,
    loading,
    signOut,
    isAuthenticated: !!user,
    isArtist: profile?.role === "artist",
    isAdmin: profile?.role === "admin",
    isCurator: profile?.role === "curator",
    refreshProfile: () => user && fetchProfileAndArtist(user.id),
  };
}
