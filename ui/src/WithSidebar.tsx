import { Box, IconButton, Stack } from "@mui/material"
import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { useRelevantSchoolInfo } from "./DataContext"
import { useCurrentSchoolId, useSwitchPage } from "./App"
import { ExpandLess, ExpandMore } from "@mui/icons-material"
import { SimpleTreeView, TreeItem } from "@mui/x-tree-view"

interface SidebarContextValue {
    hide: () => void
    show: () => void
}

const SidebarContext = createContext<SidebarContextValue>({
    hide: () => { },
    show: () => { },
})

function getItemId(yearGroupId?: string, courseId?: string, classId?: string) {
    return JSON.stringify({ yearGroupId, courseId, classId })
}
function getIds(itemId: string): {yearGroupId?: string, courseId?: string, classId?: string} {
    const { yearGroupId, courseId, classId } = JSON.parse(itemId)
    return { yearGroupId, courseId, classId }
}

export default function WithSidebar({ children }: {
    children: ReactNode
}) {
    const [hidden, setHidden] = useState(false)
    const [closed, setClosed] = useState(false)
    const schoolId = useCurrentSchoolId()
    const schoolInfo = useRelevantSchoolInfo(schoolId)

    const switchPage = useSwitchPage()

    const hide = () => setHidden(true)
    const show = () => setHidden(false)

    // TODO: On mobile, make this a drawer instead of a 10% box.

    if (hidden) {
        return <SidebarContext.Provider value={{
            hide,
            show
        }}>
            {children}
        </SidebarContext.Provider>
    } else if (closed) {
        return <SidebarContext.Provider value={{
            hide,
            show
        }}>
            <Stack direction="row">
                <Box>
                    <IconButton aria-expanded={false} aria-label="Open sidebar" onClick={() => setClosed(false)}><ExpandMore /></IconButton>
                </Box>
                <Box>
                    {children}
                </Box>
            </Stack>
        </SidebarContext.Provider>
    } else {
        return <SidebarContext.Provider value={{
            hide,
            show
        }}>
            <Stack direction="row">
                <Box width="10%">
                    <IconButton aria-expanded={true} aria-label="Close sidebar" onClick={() => setClosed(true)}><ExpandLess /></IconButton>
                    <SimpleTreeView onSelectedItemsChange={(_, item) => {
                        if (item) {
                            // Find the year group id, course id and class id
                            const info = getIds(item)
                            switchPage('', schoolId, info.yearGroupId, info.courseId, info.classId)
                        }
                    }}>
                        {schoolInfo?.yearGroups.map(yearGroup => (
                            <TreeItem key={yearGroup.id} label={yearGroup.name} itemId={getItemId(yearGroup.id)}>
                                {yearGroup.courses.map(course => (
                                    <TreeItem key={course.id} label={course.name} itemId={getItemId(yearGroup.id, course.id)}>
                                        {course.classes.map(cls => (
                                            <TreeItem key={cls.id} label={cls.name} itemId={getItemId(yearGroup.id, course.id, cls.id)} />
                                        ))}
                                    </TreeItem>
                                ))}
                            </TreeItem>
                        ))}
                    </SimpleTreeView>
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
