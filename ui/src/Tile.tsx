import { Button, Stack } from "@mui/material";
import { ReactNode } from "react";

export function TileContainer({ children }: { children: ReactNode }) {
    return <Stack direction="row" useFlexGap flexWrap="wrap">{children}</Stack>
}

export function Tile({ text, onClick }: { text: string, onClick: () => void }) {
    return <Button sx={{ padding: "10px", width: "200px", height: "200px" }} onClick={() => onClick()}>
        <h2>{text}</h2>
    </Button>
}
