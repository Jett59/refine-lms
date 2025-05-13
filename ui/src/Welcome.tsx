import { useSetPageTitle } from "./PageWrapper"

export default function Welcome() {
    useSetPageTitle('Welcome')
    return <h1>Here we are!</h1>
}
