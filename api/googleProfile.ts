import { User } from "./user"

 // This function probably already exists in googleapis. However, my first and only attempt to use googleapis for auth made the lambda init hang for some reason.
export async function getGoogleProfileInformation(accessToken: string): Promise<User> {
    const openIdConfig = await fetch('https://accounts.google.com/.well-known/openid-configuration')
    const openIdConfigJson = await openIdConfig.json()
    const userInfo = await fetch(openIdConfigJson.userinfo_endpoint, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
    const userInfoJson = await userInfo.json()
    if (!userInfoJson.sub || !userInfoJson.name || !userInfoJson.email || !userInfoJson.picture) {
        throw new Error('Invalid user info from Google')
    }
    return {
        jwtUserId: userInfoJson.sub,
        name: userInfoJson.name,
        email: userInfoJson.email,
        picture: userInfoJson.picture
    }
}
