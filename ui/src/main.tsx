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
import { ConfirmationDialogContextProvider } from './ConfirmationDialog.tsx';

export const GOOGLE_CLIENT_ID = '440807713733-li6c8t0f1pmjrlaceen6afndskghlrrm.apps.googleusercontent.com'
// This is apparently ok (https://stackoverflow.com/a/61652187)
export const GOOGLE_DRIVE_DEVELOPER_KEY = 'AIzaSyCWHD0w16RgSSBA8vpIU8And-9CzwZIS_k'
export const GOOGLE_PROJECT_NUMBER = '440807713733'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ErrorContextProvider>
        <ConfirmationDialogContextProvider>
          <UserContextProvider>
            <DataContextProvider>
              <HashRouter>
                <App />
              </HashRouter>
            </DataContextProvider>
          </UserContextProvider>
        </ConfirmationDialogContextProvider>
      </ErrorContextProvider>
    </GoogleOAuthProvider>
  </StrictMode>
)
