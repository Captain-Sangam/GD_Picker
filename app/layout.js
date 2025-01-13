import { GoogleOAuthProvider } from "@react-oauth/google";
import "../styles/globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Google Drive Picker</title>
      </head>
      <body
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div>
          <GoogleOAuthProvider
            clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
          >
            {children}
          </GoogleOAuthProvider>
        </div>
      </body>
    </html>
  );
}
