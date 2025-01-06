import { Autocomplete, TextField } from '@mui/material'

export default function AccessibleAutocomplete<Value>({ options, getOptionLabel, value, onChange, isOptionEqualToValue }: {
    options: Value[]
    getOptionLabel: (option: Value) => string
    value: Value | null
    onChange: (value: Value | null) => void
    // Needed for Values which are objects
    isOptionEqualToValue?: (option: Value, value: Value) => boolean
}) {
    return <Autocomplete
 disablePortal
        options={options}
        getOptionLabel={getOptionLabel}
        value={value}
        onChange={(_, value) => onChange(value)}
        isOptionEqualToValue={isOptionEqualToValue}
        renderInput={({ inputProps, ...extra }) => (
                <TextField
                    inputProps={{
                        ...inputProps,
                        onBlur: undefined,
                    }}
                    {...extra}
                />
        )}
    />
}
