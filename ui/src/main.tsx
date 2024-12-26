import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { HashRouter } from 'react-router-dom';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ErrorContextProvider from './ErrorContext.tsx';
import { UserContextProvider } from './UserContext.tsx';
import { DataContextProvider } from './DataContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId='440807713733-li6c8t0f1pmjrlaceen6afndskghlrrm.apps.googleusercontent.com'>
      <ErrorContextProvider>
        <UserContextProvider>
          <DataContextProvider>
            <HashRouter>
              <App />
            </HashRouter>
          </DataContextProvider>
        </UserContextProvider>
      </ErrorContextProvider>
    </GoogleOAuthProvider>
  </StrictMode>
)
