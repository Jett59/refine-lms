import { GoogleAuth, JWTInput, OAuth2Client } from "google-auth-library";
import { drive_v3 } from "googleapis";
import { AttachmentTemplate } from "../data/post";

let SERVICE_ACCOUNT_DRIVE_CLIENT: drive_v3.Drive | null = null

const GOOGLE_SERVICE_ACCOUNT_KEY: JWTInput = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}')

async function getServiceAccountClient() {
    if (!SERVICE_ACCOUNT_DRIVE_CLIENT) {
        SERVICE_ACCOUNT_DRIVE_CLIENT = new drive_v3.Drive({
            auth: new GoogleAuth({
                credentials: GOOGLE_SERVICE_ACCOUNT_KEY,
                scopes: ['https://www.googleapis.com/auth/drive']
            }),
        })
    }
    return SERVICE_ACCOUNT_DRIVE_CLIENT
}

async function getUserClient(accessToken: string) {
    const oAuthClient = new OAuth2Client()
    oAuthClient.setCredentials({ access_token: accessToken })
    return new drive_v3.Drive({ auth: oAuthClient })
}

export interface AttachmentPreparationError {
    attachmentIndex: number
    message: string
}

export async function prepareAttachments(accessToken: string, attachments: AttachmentTemplate[]): Promise<true | AttachmentPreparationError> {
    // We have to share the attachments with our service account.
    const userClient = await getUserClient(accessToken)
    const results = await Promise.all(attachments.map(async (attachment, index) => {
        if (attachment.host === 'google') {
            try {
                await userClient.permissions.create({
                    fileId: attachment.googleFileId,
                    requestBody: {
                        role: 'writer',
                        type: 'user',
                        emailAddress: GOOGLE_SERVICE_ACCOUNT_KEY.client_email
                    }
                })
            } catch (e) {
                console.error(e)
                return {
                    attachmentIndex: index,
                    message: 'Failed to share the attachment with the service account'
                }
            }
        }
        return true
    }))
    const error = results.find(result => result !== true)
    if (error) {
        return error
    }
    return true
}

export function isAttachmentPreparationError(error: any): error is AttachmentPreparationError {
    return error.attachmentIndex !== undefined && error.message !== undefined
}

export async function getFileLink(fileId: string, userEmail: string, hasEditAccess: boolean): Promise<string | null> {
    // We assume that the file is already shared with our service account.
    // We have to share it with the user and then return the webContentLink.
    const serviceAccountClient = await getServiceAccountClient()
    try {
        await serviceAccountClient.permissions.create({
            fileId,
            requestBody: {
                role: hasEditAccess ? 'writer' : 'commenter',
                type: 'user',
                emailAddress: userEmail
            }
        })
        const file = await serviceAccountClient.files.get({ fileId, fields: 'webViewLink' })
        return file.data.webViewLink ?? null
    } catch (e) {
        console.error(e)
        return null
    }
}
