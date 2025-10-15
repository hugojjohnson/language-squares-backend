import { NextFunction, Request, Response } from "express"
// import { OAuth2Client } from "google-auth-library"
import 'dotenv/config'

import UserModel from "../schemas/User"
import SessionModel from "../schemas/Session"
import * as auth from "./auth"
import { MyRequest, validateSchema, WebError } from "../scripts/utils"
import { string, z } from "zod"
import WordModel from "../schemas/Word"
import { generateSpeech } from "../scripts/tts"

// ========== Caches ==========
let publicBookCache: { _id: string, owner: string, name: string, length: number }[] | undefined = undefined

// ========== Functions ==========
const Q1 = z.object({})
const B1 = z.object({
    username: z.string(),
    hash: z.string()
})
export async function signUpWithEmail(req: MyRequest<typeof Q1, typeof B1>, res: Response, next: NextFunction) {
    validateSchema(req, [Q1, B1])
    if (req.body.username === undefined || req.body.hash === undefined) {
        throw new WebError("Details not entered correctly. Please try again.", 500)
    }

    if (await UserModel.exists({ username: req.body.username })) {
        throw new WebError("That username is already taken. Please try a different one.", 500)
    }
    const newUser = new UserModel({
        username: req.body.username,
        hash: req.body.hash
    })
    newUser.save()
    return res.send("hi there! success")
}

const Q2 = z.object({
    username: z.string(),
    hash: z.string()
})
const B2 = z.object({})
export async function signInWithEmail(req: MyRequest<typeof Q2, typeof B2>, res: Response, next: NextFunction) {
    validateSchema(req, [Q2, B2])
    if (req.query.username === undefined || req.query.hash === undefined) {
        throw new WebError("Details not entered correctly. Please try again.", 500)
    }
    const user = await UserModel.findOne({ username: req.query.username, hash: req.query.hash })
    if (user === null) {
        throw new WebError("Email or password incorrect. Please try again.", 500)
    }
    const newSession = new SessionModel({
        user: user,
    })
    await newSession.save()
    return res.send(JSON.stringify({
        token: {
            value: newSession.id
        },
        user: {
            username: user.username
        },
    }))
}



const Q3 = z.object({
    token: z.string()
})
const B3 = z.object({})
export async function signOut(req: MyRequest<typeof Q3, typeof B3>, res: Response, next: NextFunction) {
    validateSchema(req, [Q3])

    let session = await SessionModel.findById(req.query.token)
    if (session !== null) {
        session.active = false
        await session.save()
        return res.send("hi there! success")
    }
    throw new WebError("Session could not be found.", 500)
}

const Q4 = z.object({
    token: z.string()
})
const B4 = z.object({
    wordsToSend: z.array(z.object({
        targetWord: z.string(),
        targetSentence: z.string(),
        targetPinyin: z.string(),
        englishWord: z.string(),
        englishSentence: z.string(),
        id: z.string(),
        bucket: z.number(),
        starred: z.boolean()
    }))
});
export async function addWords(req: MyRequest<typeof Q4, typeof B4>, res: Response, next: NextFunction) {
    validateSchema(req, [Q4, B4])
    // TODO: Trim
    const userId = await auth.tokenToUserId(req.query.token);

    const returnJSON = []
    for (let i = 0; i < req.body.wordsToSend.length; i++) {
        const { targetWord, targetSentence, targetPinyin, englishWord, englishSentence, id } = req.body.wordsToSend[i];
        await generateSpeech(targetWord, targetSentence, englishWord, englishSentence, id);
        const newWord = new WordModel({ owner: userId, targetWord, targetSentence, targetPinyin, englishWord, englishSentence, starred: false, id })
        await newWord.save()
        returnJSON.push(newWord)
    }
    return res.send(returnJSON)
}

const Q5 = z.object({ token: z.string() })
const B5 = z.object({})
export async function updateUser(req: MyRequest<typeof Q5, typeof B5>, res: Response, next: NextFunction) {
    validateSchema(req, [Q5, B5])
    const userId = await auth.tokenToUserId(req.query.token)
    const userWords = await WordModel.find({ owner: userId })
    return res.json(userWords)
}

const Q6 = z.object({
    token: z.string(),
    id: z.string()
})
const B6 = z.object({})
export async function star(req: MyRequest<typeof Q6, typeof B6>, res: Response, next: NextFunction) {
    validateSchema(req, [Q6, B6])
    const userId = await auth.tokenToUserId(req.query.token)
    const myWord = await WordModel.findById(req.query.id)
    if (myWord === null) {
        throw new WebError("Word could not be found.", 500)
    }
    if (myWord.owner.toString() !== userId.toString()) {
        console.log(myWord.owner)
        console.log(userId)
        throw new WebError("Word not owned by user.", 500)
    }
    myWord.starred = !myWord.starred
    await myWord.save()
    return res.json(myWord)
}