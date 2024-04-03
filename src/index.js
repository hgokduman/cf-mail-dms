import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const PostalMime = require("postal-mime");

async function streamToArrayBuffer(stream, streamSize) {
    let result = new Uint8Array(streamSize);
    let bytesRead = 0;
    const reader = stream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        result.set(value, bytesRead);
        bytesRead += value.length;
    }
    return result;
}

async function uploadFile(file) {
    console.log(file.filename);
    const formData = new FormData();
    formData.append("document", new Blob([file.content]), file.filename);
    const upload = await fetch(env.API_URL, { method: "POST", headers: myHeaders, body: formData});
    console.log(await upload.text());
// try catch
}

export default {
    async email(message, env, ctx) {
        const msgFrom = message.from.toLowerCase()
        const EMAIL_WHITELIST = env.PAPERLESS_WHITELIST.split(",")
        if (!EMAIL_WHITELIST.includes(msgFrom)) {
            const rejectReason = "05_REJECT_UNAUTHORIZED_SENDER";
            message.setReject(rejectReason);
        } else {
            const rawEmail = await streamToArrayBuffer(message.raw, message.rawSize);
            const parser = new PostalMime.default();
            const parsedEmail = await parser.parse(rawEmail);
            const myHeaders = new Headers();
            myHeaders.append("Authorization", "Token " + env.API_TOKEN);
            if (parsedEmail.attachments.length > 0) {
                await Promise.all(parsedEmail.attachments.map(async (file) => {
                    console.log(file.filename);
                    const formData = new FormData();
                    formData.append("document", new Blob([file.content]), file.filename);
                    const upload = await fetch(env.API_URL, { method: "POST", headers: myHeaders, body: formData});
                    console.log(await upload.text());
                }));
            }
        }
    }
};
