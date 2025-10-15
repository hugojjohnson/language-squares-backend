import { Request, Response, NextFunction } from "express"
import SessionModel from "../schemas/Session"
import { MyRequest, validateSchema, WebError } from "./utils"
// @ts-ignore
import audioconcat from 'audioconcat';
import { spawn } from 'child_process';
import path from 'path';
import { PassThrough } from 'stream';
import { z } from "zod";
import ffmpeg from "fluent-ffmpeg";
const ffmpegPath = require('ffmpeg-static');
import * as auth from "../src/auth"
import WordModel from "../schemas/Word";


const Q1 = z.object({ token: z.string() })
const B1 = z.object({})
export async function generateAudio(req: MyRequest<typeof Q1, typeof B1>, res: Response, next: NextFunction) {
    validateSchema(req, [Q1, B1])
    const targetSentence = (word: string) => ("public/audio/targetSentence/" + word + ".mp3")
    const targetWord = (word: string) => ("public/audio/targetWord/" + word + ".mp3")
    const targetWordSlow = (word: string) => ("public/audio/targetWordSlow/" + word + ".mp3")
    const targetSentenceSlow = (word: string) => ("public/audio/targetSentenceSlow/" + word + ".mp3")
    const englishSentence = (word: string) => ("public/audio/englishSentence/" + word + ".mp3")
    const englishWord = (word: string) => ("public/audio/englishWord/" + word + ".mp3")

    const userId = await auth.tokenToUserId(req.query.token);
    const unlearnedWords = (await WordModel.find({ owner: userId, bucket: 0 }));
    const learnedWords = (await WordModel.find({ owner: userId, bucket: { $gt: 0 } }));

    const returnArr: string[] = [];

    // Number of new words to learn today
    const numNewWords = Math.min(4, unlearnedWords.length);
    const totalWords = 10; // Total number of words to practice today
    // const learnTodayWords = unlearnedWords.slice(0, numNewWords);

    await learnNewWords();
    returnArr.push("public/beep.mp3")
    await practiceOldWords();
    returnArr.push("public/beep.mp3")
    reviewNewWords();
    returnArr.push("public/beep.mp3")

    await combine(returnArr, "scripts/out.mp3")
    return res.sendFile(__dirname + "/out.mp3")


    async function learnNewWords() {
        for (let i = 0; i < numNewWords; i++) {
            learnNewWord(unlearnedWords[i].id)
            unlearnedWords[i].bucket += 1;
            await unlearnedWords[i].save()
        }
    }
    function learnNewWord(newW: string) {
        returnArr.push(englishWord(newW))
        returnArr.push("public/silent/2.mp3")
        returnArr.push(targetWord(newW))
        returnArr.push("public/silent/3.mp3")
        returnArr.push(targetWordSlow(newW))
        returnArr.push("public/silent/3.mp3")
        returnArr.push(englishSentence(newW))
        returnArr.push("public/silent/3.mp3")
        returnArr.push(targetSentence(newW))
        returnArr.push("public/silent/5.mp3")
        returnArr.push(targetSentenceSlow(newW))
        returnArr.push("public/silent/5.mp3")
    }

    async function practiceOldWords() {
        if (learnedWords.length === 0) {
            return;
        }
        for (let i = 0; i < (totalWords - numNewWords); i++) {
            const randomWord = learnedWords[Math.floor(Math.random() * learnedWords.length)]
            randomWord.bucket += 1;
            await randomWord.save()
            if (Math.random() > 0.75) {
                returnArr.push(englishSentence(randomWord.id))
                returnArr.push("public/silent/7.mp3")
                returnArr.push(targetSentence(randomWord.id))
                returnArr.push("public/silent/3.mp3")
                if (Math.random() > 0.75) {
                    returnArr.push(targetSentenceSlow(randomWord.id))
                    returnArr.push("public/silent/3.mp3")
                }
                returnArr.push(targetWord(randomWord.id))
                returnArr.push("public/silent/3.mp3")
            } else {
                returnArr.push(englishWord(randomWord.id))
                returnArr.push("public/silent/5.mp3")
                returnArr.push(targetWord(randomWord.id))
                returnArr.push("public/silent/3.mp3")
                if (Math.random() > 0.8) {
                    returnArr.push(targetWordSlow(randomWord.id))
                    returnArr.push("public/silent/3.mp3")
                }
                returnArr.push(targetSentence(randomWord.id))
                returnArr.push("public/silent/3.mp3")
            }
        }
    }

    function reviewNewWords() {
        for (let i = 0; i < numNewWords; i++) {
            const reviewWord = unlearnedWords[i].id;
            returnArr.push(englishSentence(reviewWord));
            returnArr.push("public/silent/7.mp3");
            returnArr.push(targetSentence(reviewWord));
            returnArr.push("public/silent/3.mp3");
            returnArr.push(targetSentenceSlow(reviewWord));
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