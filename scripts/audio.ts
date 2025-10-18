import { Request, Response, NextFunction } from "express"
import SessionModel from "../schemas/Session"
import { createIfNotExists, MyRequest, validateSchema, WebError } from "./utils"
// @ts-ignore
import audioconcat from 'audioconcat';
import { spawn } from 'child_process';
import path from 'path';
import { PassThrough } from 'stream';
import { z } from "zod";
import ffmpeg from "fluent-ffmpeg";
const ffmpegPath = require('ffmpeg-static');
import * as auth from "../src/auth"
import WordModel, { WordI } from "../schemas/Word";


const Q1 = z.object({ token: z.string() })
const B1 = z.object({})
export async function generateAudio(req: MyRequest<typeof Q1, typeof B1>, res: Response, next: NextFunction) {
    validateSchema(req, [Q1, B1])
    const targetSentence = async (word: WordI) => await createIfNotExists("public/audio/targetSentence/", word.targetSentence, word.id, false, false);
    const targetWord = async (word: WordI) => await createIfNotExists("public/audio/targetWord/", word.targetWord, word.id, false, false);
    const targetWordSlow = async (word: WordI) => await createIfNotExists("public/audio/targetWordSlow/", word.targetWord, word.id, false, true);
    const targetSentenceSlow = async (word: WordI) => await createIfNotExists("public/audio/targetSentenceSlow/", word.targetSentence, word.id, false, true);
    const englishSentence = async (word: WordI) => await createIfNotExists("public/audio/englishSentence/", word.englishSentence, word.id, true, false);
    const englishWord = async (word: WordI) => await createIfNotExists("public/audio/englishWord/", word.englishWord, word.id, true, false);

    const userId = await auth.tokenToUserId(req.query.token);
    const unlearnedWords: WordI[] = (await WordModel.find({ owner: userId, bucket: 0 }));
    const learnedWords: WordI[] = (await WordModel.find({ owner: userId, bucket: { $gt: 0 } }));

    const returnArr: string[] = [];

    // Number of new words to learn today
    const numNewWords = Math.min(4, unlearnedWords.length);
    const totalWords = 10; // Total number of words to practice today
    // const learnTodayWords = unlearnedWords.slice(0, numNewWords);

    await learnNewWords();
    returnArr.push("public/extra/beep.mp3")
    await practiceOldWords();
    returnArr.push("public/extra/beep.mp3")
    await reviewNewWords();
    returnArr.push("public/extra/youre-all-done.mp3");
    returnArr.push("public/extra/beep.mp3")

    await combine(returnArr, "scripts/out.mp3")
    return res.sendFile(__dirname + "/out.mp3")


    async function learnNewWords() {
        if (numNewWords == 0) {
            returnArr.push("public/extra/no-more-to-learn.mp3");
        }
        for (let i = 0; i < numNewWords; i++) {
            await learnNewWord(unlearnedWords[i])
            unlearnedWords[i].bucket += 1;
            await unlearnedWords[i].save()
        }
    }
    async function learnNewWord(newW: WordI) {
        returnArr.push(await englishWord(newW))
        returnArr.push("public/silent/2.mp3")
        returnArr.push(await targetWord(newW))
        returnArr.push("public/silent/3.mp3")
        returnArr.push(await targetWordSlow(newW))
        returnArr.push("public/silent/3.mp3")
        returnArr.push(await englishSentence(newW))
        returnArr.push("public/silent/3.mp3")
        returnArr.push(await targetSentence(newW))
        returnArr.push("public/silent/5.mp3")
        returnArr.push(await targetSentenceSlow(newW))
        returnArr.push("public/silent/5.mp3")
    }

    async function practiceOldWords() {
        if (learnedWords.length === 0) {
            returnArr.push("public/extra/no-more-to-review.mp3");
            return;
        }
        for (let i = 0; i < (totalWords - numNewWords); i++) {
            const randomWord = learnedWords[Math.floor(Math.random() * learnedWords.length)]
            randomWord.bucket += 1;
            await randomWord.save()
            if (Math.random() > 0.75) {
                returnArr.push(await englishSentence(randomWord))
                returnArr.push("public/silent/7.mp3")
                returnArr.push(await targetSentence(randomWord))
                returnArr.push("public/silent/3.mp3")
                if (Math.random() > 0.75) {
                    returnArr.push(await targetSentenceSlow(randomWord))
                    returnArr.push("public/silent/3.mp3")
                }
                returnArr.push(await targetWord(randomWord))
                returnArr.push("public/silent/3.mp3")
            } else {
                returnArr.push(await englishWord(randomWord))
                returnArr.push("public/silent/5.mp3")
                returnArr.push(await targetWord(randomWord))
                returnArr.push("public/silent/3.mp3")
                if (Math.random() > 0.8) {
                    returnArr.push(await targetWordSlow(randomWord))
                    returnArr.push("public/silent/3.mp3")
                }
                returnArr.push(await targetSentence(randomWord))
                returnArr.push("public/silent/3.mp3")
            }
        }
    }

    async function reviewNewWords() {
        for (let i = 0; i < numNewWords; i++) {
            const reviewWord = unlearnedWords[i];
            returnArr.push(await englishSentence(reviewWord));
            returnArr.push("public/silent/7.mp3");
            returnArr.push(await targetSentence(reviewWord));
            returnArr.push("public/silent/3.mp3");
            returnArr.push(await targetSentenceSlow(reviewWord));
            returnArr.push("public/silent/3.mp3");
        }
    }
}

// async function duration(filePath: string): Promise<number> {
//     return new Promise((resolve, reject) => {
//         ffmpeg(filePath)
//             .ffprobe((err, data) => {
//                 if (err) {
//                     return reject(err);
//                 }
//                 const duration = data.format.duration;
//                 resolve(duration || 0);
//             });
//     });
// }

async function combine(inputFiles: string[], outputFile: string) {
    return new Promise<void>((resolve, reject) => {
        const command = ffmpeg();

        inputFiles.forEach(file => {
            command.input(file);
        });

        command
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .mergeToFile(outputFile, ".");
    });
}