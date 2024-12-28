import { Db, ObjectId } from "mongodb";

export interface User {
    _id?: ObjectId
    jwtUserId: string
    name: string
    email: string
    picture: string
}

const COLLECTION_NAME = 'users'

function getCollection(db: Db) {
    return db.collection<User>(COLLECTION_NAME)
}

export async function findUser(db: Db, userId: ObjectId): Promise<User | null> {
    return await getCollection(db).findOne({
        _id: userId
    })
}

export async function findUserByJwtUserId(db: Db, jwtUserId: string): Promise<User | null> {
    return await getCollection(db).findOne({ jwtUserId })
}

export async function createUser(db: Db, user: User): Promise<ObjectId> {
    const result = await getCollection(db).insertOne(user)
    return result.insertedId
}

export async function ensureUserExists(db: Db, user: User): Promise<User> {
    const existingUser = await findUserByJwtUserId(db, user.jwtUserId)
    if (existingUser) {
        return existingUser
    }
    const userId = await createUser(db, user)
    return {
        _id: userId,
        ...user
    }
}
