// Gives the login page its own title and tells search engines not to index it.
export const metadata = {
  title: 'Staff sign in',
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }) {
  return children;
}
