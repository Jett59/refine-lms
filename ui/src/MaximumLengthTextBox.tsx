import { Stack, TextField, TextFieldProps, Typography } from "@mui/material";

export default function MaximumLengthTextBox({ maximumLength, ...textFieldpProps }: {
    maximumLength: number
} & TextFieldProps) {
    const stringValue = String(textFieldpProps.value)
    return <Stack direction="column" spacing={2}>
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
        <Typography color={textFieldpProps.required && stringValue.length === 0 ? 'error' : undefined}>{stringValue.length}/{maximumLength}</Typography>
    </Stack>
}