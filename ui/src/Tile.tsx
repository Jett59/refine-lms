import { Button, ButtonProps, Card, Stack } from "@mui/material";
import { ReactNode } from "react";

export function TileContainer({ children }: { children: ReactNode }) {
    return <Stack direction="row" useFlexGap flexWrap="wrap">{children}</Stack>
}

export function TileButton({ text, onClick, buttonProps }: { text: string, onClick: () => void, buttonProps?: ButtonProps}) {
    return <Button sx={{ padding: "10px", width: "200px", height: "200px" }} onClick={() => onClick()} {...buttonProps}>
        <h2>{text}</h2>
    </Button>
}

export function TileCard({ children }: { children: ReactNode }) {
    return <Card sx={{ padding: "10px", width: "200px", height: "200px" }}>{children}</Card>
}
