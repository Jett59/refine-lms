import { Stack, TextField, TextFieldProps, Typography } from "@mui/material";

export default function MaximumLengthTextBox({ maximumLength, ...textFieldpProps }: {
    maximumLength: number
} & TextFieldProps) {
    const stringValue = String(textFieldpProps.value)
    return <Stack direction="column">
        <TextField
            {...textFieldpProps}
            onChange={e => {
                let newStringValue = String(e.target.value)
                if (newStringValue.length > maximumLength) {
                    newStringValue = newStringValue.substring(0, maximumLength)
                }
                e.target.value = newStringValue
                textFieldpProps.onChange?.(e)
            }}
        />
        <Typography>{stringValue.length}/{maximumLength}</Typography>
    </Stack>
}