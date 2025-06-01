import { GoogleAuth, JWTInput, OAuth2Client } from "google-auth-library";
import { drive_v3 } from "@googleapis/drive";
import { AttachmentTemplate } from "../data/post";
import { AttachmentPreparationError } from "../data/api";

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
                    attachmentTitle: attachment.title,
                    attachmentFileId: attachment.googleFileId,
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
    return error.attachmentTitle !== undefined && error.attachmentFileId !== undefined && error.message !== undefined
}

export async function getFileLink(fileId: string, fileName: string, userEmail: string, userName: string, hasEditAccess: boolean, shouldCreateCopy: boolean): Promise<{ link: string, fileId: string } | null> {
    // We assume that the file is already shared with our service account.
    if (shouldCreateCopy) {
        return await createCopyAndGetLink(fileId, fileName, userEmail, userName)
    }
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
        const link = file.data.webViewLink
        return link ? { link, fileId } : null
    } catch (e) {
        console.error(e)
        return null
    }
}

export async function createCopyAndGetLink(fileId: string, fileName: string, userEmail: string, userName: string): Promise<{ link: string, fileId: string } | null> {
    const serviceAccountClient = await getServiceAccountClient()
    try {
        const copy = await serviceAccountClient.files.copy({
            fileId,
            fields: 'id,webViewLink',
            requestBody: {
                name: `${userName} - ${fileName}`
            }
        })
        await serviceAccountClient.permissions.create({
            fileId: copy.data.id!,
            requestBody: {
                role: 'writer',
                type: 'user',
                emailAddress: userEmail
            }
        })
        const link = copy.data.webViewLink
        const id = copy.data.id
        return link && id ? { link, fileId: id } : null
    } catch (e) {
        console.error(e)
        return null
    }
}

export async function createCopy(fileId: string, newFileName: string): Promise<{ fileId: string } | null> {
    const serviceAccountClient = await getServiceAccountClient()
    try {
        const copy = await serviceAccountClient.files.copy({
            fileId,
            fields: 'id',
            requestBody: {
                name: newFileName
            }
        })
        const id = copy.data.id
        return id ? { fileId: id } : null
    } catch (e) {
        console.error(e)
        return null
    }
}
