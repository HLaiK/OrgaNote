import { useEffect, useState } from "react";

export default function useUser() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let existing = localStorage.getItem("organote_user_id");

    if (!existing) {
      existing = "user_" + crypto.randomUUID();
      localStorage.setItem("organote_user_id", existing);
    }

    setUserId(existing);
  }, []);

  return userId;
}
