import { string, z } from "zod";
import fs from "fs/promises";
import { MyRequest, validateSchema, WebError } from "../scripts/utils";
import { NextFunction, Response } from "express";
import { generateSpeech } from "../scripts/tts";
import WordModel from "../schemas/Word";
import * as auth from "./auth";

const Q1 = z.object({
    token: z.string()
})
const B1 = z.object({
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
export async function addWords(req: MyRequest<typeof Q1, typeof B1>, res: Response, next: NextFunction) {
    validateSchema(req, [Q1, B1])
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

const Q2 = z.object({
    token: z.string(),
    id: z.string()
})
const B2 = z.object({})
export async function star(req: MyRequest<typeof Q2, typeof B2>, res: Response, next: NextFunction) {
    validateSchema(req, [Q2, B2])
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

const Q3 = z.object({
    token: z.string(),
    id: z.string()
});
const B3 = z.object({});
export async function deleteWord(req: MyRequest<typeof Q3, typeof B3>, res: Response, next: NextFunction) {
    validateSchema(req, [Q3, B3])
    const userId = await auth.tokenToUserId(req.query.token)
    const myWord = await WordModel.findOne({ id: req.query.id })
    if (myWord === null) {
        throw new WebError("Word could not be found.", 500)
    }
    myWord.deleteOne();
    await tryDelete("public/audio/targetWord/" + myWord.id + ".mp3")
    await tryDelete("public/audio/targetWordSlow/" + myWord.id + ".mp3")
    await tryDelete("public/audio/targetSentence/" + myWord.id + ".mp3")
    await tryDelete("public/audio/targetSentenceSlow/" + myWord.id + ".mp3")
    await tryDelete("public/audio/englishWord/" + myWord.id + ".mp3")
    await tryDelete("public/audio/englishSentence/" + myWord.id + ".mp3")
    return res.send("Success!")
}

/**
 * Tries to delete a file. Does nothing if the file doesn't exist.
 * @param path File path to delete
 */
async function tryDelete(path: string): Promise<void> {
  try {
    await fs.unlink(path);
    console.log(`Deleted: ${path}`);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      console.error(`Error deleting ${path}:`, err);
    } else {
      console.log(`File not found (ok): ${path}`);
    }
  }
}


const Q4 = z.object({
    token: z.string(),
    id: z.string()
})
const B4 = z.object({
    newBucket: z.number()
})
export async function changeBucket(req: MyRequest<typeof Q4, typeof B4>, res: Response, next: NextFunction) {
    validateSchema(req, [Q4, B4]);
    const userId = await auth.tokenToUserId(req.query.token);
    const myWord = await WordModel.findOne({ id: req.query.id });
    if (myWord === null) {
        throw new WebError("Word could not be found.", 500);
    }
    if (myWord.owner.toString() !== userId.toString()) {
        console.log(myWord.owner)
        console.log(userId)
        throw new WebError("Word not owned by user.", 500)
    }
    if (req.body.newBucket < 0) {
        throw new WebError("Bucket must be non-negative.", 400);
    }
    myWord.bucket = req.body.newBucket;
    await myWord.save();
    return res.json(myWord);
}