import { useEffect } from "react";

import { useAuth } from "../context/AuthContext";
import { initializeAppReviewPrompt } from "../utils/appReviewPrompt";

export default function RateAppPrompt() {
  const { user, isSessionBootstrapping } = useAuth();

  useEffect(() => {
    if (!user || isSessionBootstrapping) return;

    initializeAppReviewPrompt();
  }, [isSessionBootstrapping, user?.id, user?._id]);

  return null;
}
