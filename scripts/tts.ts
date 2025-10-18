// Imports the Google Cloud client library
import * as textToSpeech from "@google-cloud/text-to-speech"
const { SsmlVoiceGender, AudioEncoding } = textToSpeech.protos.google.cloud.texttospeech.v1;
import * as fs from "fs"
import * as util from "util"
// Creates a client
const client = new textToSpeech.TextToSpeechClient()

export async function setupFolders() {
    makeIfNotExits("public/audio/");
    makeIfNotExits("public/audio/targetWord/");
    makeIfNotExits("public/audio/targetWordSlow/");
    makeIfNotExits("public/audio/targetSentence/");
    makeIfNotExits("public/audio/targetSentenceSlow/");
    makeIfNotExits("public/audio/englishWord/");
    makeIfNotExits("public/audio/englishSentence/");
    function makeIfNotExits(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
}

export async function generateSpeech(targetWord: string, targetSentence: string, englishWord: string, englishSentence: string, id: string): Promise<void> {
    try {
        await makeRequest("public/audio/targetWord/" + id + ".mp3", targetWord, false, false);
        await makeRequest("public/audio/targetWordSlow/" + id + ".mp3", targetWord, false, true);
        await makeRequest("public/audio/targetSentence/" + id + ".mp3", targetSentence, false, false);
        await makeRequest("public/audio/targetSentenceSlow/" + id + ".mp3", targetSentence, false, true);
        await makeRequest("public/audio/englishWord/" + id + ".mp3", englishWord, true, false);
        await makeRequest("public/audio/englishSentence/" + id + ".mp3", englishSentence, true, false);
    } catch (error) {
        console.error('ERROR:', error);
        throw new Error("An error occurred while generating speech.");
    }
}

export async function makeRequest(myPath: string, text: string, english: boolean, slow: boolean) {
    // There's too many, I can't choose!
    const voices = [
        "cmn-CN-Chirp3-HD-Achernar", "cmn-CN-Chirp3-HD-Achird", "cmn-CN-Chirp3-HD-Algenib",
        "cmn-CN-Chirp3-HD-Algieba", "cmn-CN-Chirp3-HD-Alnilam", "cmn-CN-Chirp3-HD-Aoede",
        "cmn-CN-Chirp3-HD-Autonoe", "cmn-CN-Chirp3-HD-Callirrhoe", "cmn-CN-Chirp3-HD-Charon",
        "cmn-CN-Chirp3-HD-Despina", "cmn-CN-Chirp3-HD-Enceladus", "cmn-CN-Chirp3-HD-Erinome",
        "cmn-CN-Chirp3-HD-Fenrir", "cmn-CN-Chirp3-HD-Gacrux", "cmn-CN-Chirp3-HD-Iapetus",
        "cmn-CN-Chirp3-HD-Kore", "cmn-CN-Chirp3-HD-Laomedeia", "cmn-CN-Chirp3-HD-Leda",
        "cmn-CN-Chirp3-HD-Orus", "cmn-CN-Chirp3-HD-Puck", "cmn-CN-Chirp3-HD-Pulcherrima",
        "cmn-CN-Chirp3-HD-Rasalgethi", "cmn-CN-Chirp3-HD-Sadachbia", "cmn-CN-Chirp3-HD-Sadaltager",
        "cmn-CN-Chirp3-HD-Schedar", "cmn-CN-Chirp3-HD-Sulafat", "cmn-CN-Chirp3-HD-Umbriel",
        "cmn-CN-Chirp3-HD-Vindemiatrix", "cmn-CN-Chirp3-HD-Zephyr", "cmn-CN-Chirp3-HD-Zubenelgenubi",
        "cmn-CN-Standard-A", "cmn-CN-Standard-B", "cmn-CN-Standard-C", "cmn-CN-Standard-D", "cmn-CN-Wavenet-A",
        "cmn-CN-Wavenet-B", "cmn-CN-Wavenet-C", "cmn-CN-Wavenet-D",
    ];
    const englishVoices = ["en-US-Chirp3-HD-Achernar", "en-US-Chirp3-HD-Achird", "en-US-Chirp3-HD-Algenib",
        "en-US-Chirp3-HD-Algieba", "en-US-Chirp3-HD-Alnilam", "en-US-Chirp3-HD-Aoede", "en-US-Chirp3-HD-Autonoe",
        "en-US-Chirp3-HD-Callirrhoe", "en-US-Chirp3-HD-Charon", "en-US-Chirp3-HD-Despina", "en-US-Chirp3-HD-Enceladus",
        "en-US-Chirp3-HD-Erinome", "en-US-Chirp3-HD-Fenrir", "en-US-Chirp3-HD-Gacrux", "en-US-Chirp3-HD-Iapetus",
        "en-US-Chirp3-HD-Kore", "en-US-Chirp3-HD-Laomedeia", "en-US-Chirp3-HD-Leda", "en-US-Chirp3-HD-Orus",
        "en-US-Chirp3-HD-Puck", "en-US-Chirp3-HD-Pulcherrima", "en-US-Chirp3-HD-Rasalgethi", "en-US-Chirp3-HD-Sadachbia",
        "en-US-Chirp3-HD-Sadaltager", "en-US-Chirp3-HD-Schedar", "en-US-Chirp3-HD-Sulafat", "en-US-Chirp3-HD-Umbriel",
        "en-US-Chirp3-HD-Vindemiatrix", "en-US-Chirp3-HD-Zephyr", "en-US-Chirp3-HD-Zubenelgenubi"];
    const randomEnglishVoice = englishVoices[Math.floor(Math.random() * englishVoices.length)];
    const randomMandarinVoice = voices[Math.floor(Math.random() * voices.length)];

    let request = {
        input: { text: text },
        voice: {
            languageCode: (english ? 'en-US' : 'cmn-CN'),
            name: (english ? randomEnglishVoice : randomMandarinVoice)
        },
        audioConfig: { audioEncoding: AudioEncoding.MP3, speakingRate: (slow ? 0.5 : 1) },
    }

    let response = await client.synthesizeSpeech(request)
    if (!response || !response[0]) {
        throw new Error('Failed to synthesize speech')
    }

    if (response[0].audioContent) {
        fs.writeFileSync(myPath, response[0].audioContent, 'binary')
    } else {
        console.error("Error: Could not write audio content.")
    }
}
