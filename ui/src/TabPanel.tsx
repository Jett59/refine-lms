import { Stack, Tab, Tabs } from "@mui/material"
import { ReactNode, useMemo } from "react"

export interface TabPanelOption {
    label: ReactNode
    ariaLabel?: string
    onSelect: () => void
    value: ReactNode
}

export default function TabPanel({ index, tabs }: {
    index: number
    tabs: TabPanelOption[]
}) {
    const uniqueId = useMemo(() => Math.random().toString(36).substring(7), [])

    return <Stack direction="column">
        <Tabs value={index} onChange={(_, newIndex) => tabs[newIndex].onSelect()}>
            {tabs.map((tab, i) => (
                <Tab key={i} label={tab.label} aria-label={tab.ariaLabel} id={`tab-${uniqueId}-${i}`} />
            ))}
        </Tabs>
        <div role="tabpanel" aria-labelledby={`tab-${uniqueId}-${index}`}>
            {tabs[index].value}
        </div>
    </Stack>
}
