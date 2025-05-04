import { Button, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { createContext, ReactNode, useContext, useState } from "react";

const ConfirmationDialogContext = createContext<(title: string, okText: string, success: () => void, error?: () => void) => void>((_title, _question, _success, error) => error?.())

export function ConfirmationDialogContextProvider({ children }: { children: ReactNode }) {
    interface ConfirmationQueueItem {
        title: string
        okText: string
        success: () => void,
        error?: () => void,
    }
    const [confirmationQueue, setConfirmationQueue] = useState<ConfirmationQueueItem[]>([])

    const succeedFirst = () => {
        confirmationQueue[0].success()
        // Remove the first element
        setConfirmationQueue(confirmationQueue => confirmationQueue.slice(1))
    }
    const failFirst = () => {
        confirmationQueue[0].error?.()
        // Remove the first element
        setConfirmationQueue(confirmationQueue => confirmationQueue.slice(1))
    }

    return <ConfirmationDialogContext.Provider
        value={(title, okText, success, error) => {
            setConfirmationQueue(confirmationQueue => [...confirmationQueue, { title, okText, success, error }])
        }}
    >
        {children}
        <Dialog open={confirmationQueue.length > 0} onClose={failFirst}>
            <DialogTitle>
                {confirmationQueue[0]?.title}
            </DialogTitle>
            <DialogActions>
                <Button variant="outlined" onClick={failFirst}>Cancel</Button>
                <Button variant="contained" onClick={succeedFirst}>{confirmationQueue[0]?.okText}</Button>
            </DialogActions>
        </Dialog>
    </ConfirmationDialogContext.Provider>
}

export const useConfirmationDialog = () => useContext(ConfirmationDialogContext)
