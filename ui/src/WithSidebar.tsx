import { Box, Stack } from "@mui/material"
import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { useRelevantSchoolInfo } from "./DataContext"
import { useCurrentSchoolId } from "./App"

interface SidebarContextValue {
    hide: () => void
    show: () => void
}

const SidebarContext = createContext<SidebarContextValue>({
    hide: () => { },
    show: () => { },
})

export default function WithSidebar({ children }: {
    children: ReactNode
}) {
    const [hidden, setHidden] = useState(false)
    const schoolId = useCurrentSchoolId()
    const schoolInfo = useRelevantSchoolInfo(schoolId)

    const hide = () => setHidden(true)
    const show = () => setHidden(false)

    if (hidden) {
        return <SidebarContext.Provider value={{
            hide,
            show
        }}>
            {children}
        </SidebarContext.Provider>
    } else {
        return <SidebarContext.Provider value={{
            hide,
            show
        }}>
            <Stack direction="row">
                <Box width="10%">
                    {schoolInfo?.name}
                </Box>
                <Box width="90%">
                    {children}
                </Box>
            </Stack>
        </SidebarContext.Provider>
    }
}

export function useHideSidebar() {
    const { show, hide } = useContext(SidebarContext)
    useEffect(() => {
        hide()
        return show
    }, [])
}
