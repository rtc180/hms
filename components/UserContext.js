'use client'; // This file runs in the browser

import { createContext, useContext } from 'react';

// A React "context" lets any component read the current user without passing props down.
const UserContext = createContext(null);

// Wrap the dashboard with this and give it the logged-in user
export function UserProvider({ user, children }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

// Any component can call useUser() to get { id, name, role }
export function useUser() {
  return useContext(UserContext);
}
