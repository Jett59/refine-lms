import { Button, Menu } from "@mui/material";
import { ReactNode, useMemo, useState } from "react";

export default function SimpleMenu({ buttonContents, childrenSupplier, buttonAriaLabel }: { buttonContents: ReactNode, childrenSupplier: (close: () => void) => ReactNode, buttonAriaLabel?: string }) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
    const open = Boolean(anchorEl)

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }
    const handleClose = () => {
        setAnchorEl(null)
    }

    const uniqueId = useMemo(() => Math.random().toString(36).substring(7), [])

    return <>
        <Button
            aria-label={buttonAriaLabel}
            aria-controls={`simple-menu-${uniqueId}`}
            aria-haspopup="true"
            aria-expanded={open}
            onClick={handleClick}
        >
            {buttonContents}
        </Button>
        <Menu
            id={`simple-menu-${uniqueId}`}
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
        >
            {childrenSupplier(handleClose)}
        </Menu>
    </>
}
