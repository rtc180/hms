// Browser-side helper for calling our API.
// Throws an Error with a readable message when the server says something went wrong.
export async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',                          // Send the session cookie
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  // Try to read the JSON reply (it may be empty on errors)
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  // Session expired: send the user back to the login page
  if (response.status === 401 && !url.startsWith('/api/auth/login')) {
    window.location.href = '/login';
  }

  // Any other failure becomes an Error that the page can show
  if (!response.ok) {
    throw new Error((data && data.error) || 'Something went wrong. Please try again.');
  }
  return data;
}

// Format a date for display, e.g. 07 Nov 2026
export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Format a date and time, e.g. 07 Nov 2026, 14:30
export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
