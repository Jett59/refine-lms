import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { HashRouter } from 'react-router-dom';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserContextProvider } from './UserContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId='440807713733-li6c8t0f1pmjrlaceen6afndskghlrrm.apps.googleusercontent.com'>
      <UserContextProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </UserContextProvider>
    </GoogleOAuthProvider>
  </StrictMode>
)
