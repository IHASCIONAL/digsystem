import useSWR from "swr";

async function fetchCurrentUser(key) {
  const response = await fetch(key);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export function useCurrentUser() {
  const { data, isLoading, mutate } = useSWR("/api/v1/user", fetchCurrentUser);

  return {
    user: data ?? null,
    isLoading,
    refresh: mutate,
  };
}
