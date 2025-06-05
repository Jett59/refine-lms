import { TextField, TextFieldProps } from "@mui/material";
import { useEffect, useState } from "react";

export default function NumericalTextBox({ numberValue, onNumberChange, permitDecimal, ...textFieldProps }: {
    numberValue: number
    onNumberChange: (value: number) => void
    permitDecimal?: boolean
} & TextFieldProps) {
    // To allow the user to empty the text box, we need this condition
    const [isEmpty, setIsEmpty] = useState(false)

    // But if the provided value is non-zero, we need to set the text box to that value
    useEffect(() => {
        if (numberValue !== 0 && isEmpty) {
            setIsEmpty(false)
        }
    }, [numberValue, isEmpty])

    return <TextField
        {...textFieldProps}
        type="number"
        value={isEmpty ? '' : numberValue}
        onChange={(e) => {
            if (e.target.value === "") {
                setIsEmpty(true)
                onNumberChange(0)
            } else {
                try {
                    const newValue = Number(e.target.value)
                    if (!permitDecimal && newValue % 1 !== 0) {
                        // The number is a decimal, so we set the text box to empty
                        setIsEmpty(true)
                        onNumberChange(0)
                    } else {
                        setIsEmpty(false)
                        onNumberChange(newValue)
                    }
                } catch (e) {
                    // The number was obviously invalid
                    // So we set the text box to empty
                    setIsEmpty(true)
                    onNumberChange(0)
                }
            }
        }}
    />
}
