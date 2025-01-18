export function formatDate(date: Date) {
    const timePart = Intl.DateTimeFormat('en-GB', {
        hour: 'numeric',
        minute: 'numeric',
    }).format(date)
    let datePart

    const today = new Date()
    const yesterday = new Date(today.getTime() - 1000*60*60*24)
    if (date.toDateString() === today.toDateString()) {
        datePart = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
        datePart = 'Yesterday'
    }else {
        datePart = Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(date)
    }
    return `${datePart} at ${timePart}`
}
