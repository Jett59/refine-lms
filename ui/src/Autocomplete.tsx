import { Autocomplete, TextField } from '@mui/material'
import { RefObject } from 'react'

export default function AccessibleAutocomplete<Value>({ options, getOptionLabel, value, onChange, isOptionEqualToValue, inputRef , error}: {
    options: Value[]
    getOptionLabel: (option: Value) => string
    value: Value | null
    onChange: (value: Value | null) => void
    // Needed for Values which are objects
    isOptionEqualToValue?: (option: Value, value: Value) => boolean
    inputRef?: RefObject<HTMLElement>
    error?: boolean
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
                inputRef={inputRef}
                error={error}
                inputProps={{
                    ...inputProps,
                    // REF: https://github.com/mui/material-ui/issues/22956#issuecomment-2044638752
                    onBlur: undefined,
                }}
                {...extra}
            />
        )}
    />
}
