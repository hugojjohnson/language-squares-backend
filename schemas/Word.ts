import { Schema, Document, model, ObjectId } from "mongoose";


interface I extends Document {
    owner: ObjectId;
    targetWord: string;
    targetSentence: string;
    targetPinyin: string;
    englishWord: string;
    englishSentence: string;
    id: string;
    bucket: number;
    starred: boolean;
}

const S: Schema<I> = new Schema({
    owner: { type: Schema.Types.ObjectId, required: true },
    targetWord: { type: String, required: true },
    targetSentence: { type: String, required: true },
    targetPinyin: { type: String, required: true },
    englishWord: { type: String, required: true },
    englishSentence: { type: String, required: true },
    id: { type: String, requered: true },
    bucket: { type: Number, default: 0 },
    starred: { type: Boolean, required: true }
})

const WordModel = model<I>("Words", S)

export default WordModel