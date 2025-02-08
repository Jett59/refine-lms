import { Button, ButtonProps, Card, Stack } from "@mui/material";
import { ReactNode } from "react";

export function TileContainer({ centre, children }: {
    centre?: boolean
    children: ReactNode
}) {
    return <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" justifyContent={centre ? 'center' : undefined}>
        {children}
    </Stack>
}

export function TileButton({ text, onClick, buttonProps }: { text: ReactNode, onClick: () => void, buttonProps?: ButtonProps }) {
    return <Button sx={{ padding: "10px", width: "200px", height: "200px" }} onClick={() => onClick()} {...buttonProps}>
        <h2>{text}</h2>
    </Button>
}

export function TileCard({ children }: { children: ReactNode }) {
    return <Card sx={{ padding: "10px", width: "200px", height: "200px" }}>{children}</Card>
}
