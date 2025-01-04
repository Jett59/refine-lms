import { Box, Paper, Typography, useTheme } from "@mui/material"
import { ReactNode } from "react"

const paddingMargins = '10px';

export default function PageWrapper({ title, children }: {
    title: string | ReactNode
    children: ReactNode
}) {
    const theme = useTheme()

    return <Box position="static">
        <Box paddingLeft={paddingMargins} paddingRight={paddingMargins} bgcolor={theme.palette.primary.light} paddingTop={'32px'} paddingBottom={'48px'}>
            <Typography variant="h4" align="center">{title}</Typography>
        </Box>
        <Box paddingLeft={paddingMargins} paddingRight={paddingMargins} position={'relative'} style={{ top: '-20px' }}>
            <Paper elevation={2}>
                {children}
            </Paper>
        </Box>
    </Box>
}
