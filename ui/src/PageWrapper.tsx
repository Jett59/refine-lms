import { Box, Paper, Stack, Typography, useTheme } from "@mui/material"
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react"

const paddingMargins = '10px';

interface PageWrapperContextValue {
    changeTitle: (title: string) => void
    changeTitleButtons: (buttons: ReactNode) => void
}

const PageWrapperContext = createContext<PageWrapperContextValue>({ changeTitle: () => { }, changeTitleButtons: () => { } })

export default function PageWrapper({ children }: {
    children: ReactNode
}) {
    const theme = useTheme()
    const [title, setTitle] = useState('')
    const [titleButtons, setTitleButtons] = useState<ReactNode | null>(null)

useEffect(() => {
    document.title = title
}, [title])

    return <Box position="static">
        <Box paddingLeft={paddingMargins} paddingRight={paddingMargins} bgcolor={theme.palette.primary.light} paddingTop={'32px'} paddingBottom={'48px'}>
            <Stack direction="row">
                <Typography aria-live="polite" variant="h4" align="center">{title}</Typography>
                {titleButtons}
            </Stack>
        </Box>
        <Box paddingLeft={paddingMargins} paddingRight={paddingMargins} position={'relative'} style={{ top: '-20px' }}>
            <Paper elevation={2}>
                <PageWrapperContext.Provider value={{
                    changeTitle: useMemo(() => setTitle, []),
                    changeTitleButtons: useMemo(() => setTitleButtons, [])
                }}>
                    {children}
                </PageWrapperContext.Provider>
            </Paper>
        </Box>
    </Box>
}

export function useSetPageTitle(title: string) {
    const { changeTitle } = useContext(PageWrapperContext)
    useEffect(() => {
        changeTitle(title)
    }, [changeTitle, title])
}

export function useSetPageTitleButtons(buttons: ReactNode) {
    const { changeTitleButtons } = useContext(PageWrapperContext)
    useEffect(() => {
        changeTitleButtons(buttons)
        return () => changeTitleButtons(null)
    }, [changeTitleButtons, buttons])
}
