import { TextField } from "@mui/material";
import { useEffect, useState } from "react";

export default function NumericalTextBox({ value, onChange, permitDecimal }: {
    value: number
    onChange: (value: number) => void
    permitDecimal?: boolean
}) {
    // To allow the user to empty the text box, we need this condition
    const [isEmpty, setIsEmpty] = useState(false)

    // But if the provided value is non-zero, we need to set the text box to that value
    useEffect(() => {
        if (value !== 0 && isEmpty) {
            setIsEmpty(false)
        }
    }, [value, isEmpty])

    return <TextField
        type="number"
        value={isEmpty ? '' : value}
        onChange={(e) => {
            if (e.target.value === "") {
                setIsEmpty(true)
                onChange(0)
            } else {
                try {
                    const newValue = Number(e.target.value)
                    if (!permitDecimal && newValue % 1 !== 0) {
                        // The number is a decimal, so we set the text box to empty
                        setIsEmpty(true)
                        onChange(0)
                    } else {
                        setIsEmpty(false)
                        onChange(newValue)
                    }
                } catch (e) {
                    // The number was obviously invalid
                    // So we set the text box to empty
                    setIsEmpty(true)
                    onChange(0)
                }
            }
        }}
    />
}
