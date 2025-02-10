import { Stack, Tab, Tabs, Typography } from "@mui/material"
import { ReactNode, useMemo } from "react"

export interface TabPanelOption {
    label: ReactNode
    ariaLabel?: string
    heading?: string
    onSelect: () => void
    value: ReactNode
}

export default function TabPanel({ index, tabs, endButton }: {
    index: number
    tabs: TabPanelOption[]
    endButton?: ReactNode
}) {
    const uniqueId = useMemo(() => Math.random().toString(36).substring(7), [])

    return <Stack direction="column" spacing={2}>
        <Tabs value={index} onChange={(_, newIndex) => tabs[newIndex].onSelect()}>
            {tabs.map((tab, i) => (
                <Tab key={i} label={tab.label} aria-label={tab.ariaLabel} id={`tab-${uniqueId}-${i}`} />
            ))}
            {endButton}
        </Tabs>
        <div role="tabpanel" aria-labelledby={`tab-${uniqueId}-${index}`}>
            {tabs[index].heading && <Typography variant="h4">{tabs[index].heading}</Typography>}
            {tabs[index].value}
        </div>
    </Stack>
}
