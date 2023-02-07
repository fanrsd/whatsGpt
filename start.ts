const process = require("process")
const qrcode = require("qrcode-terminal");
const { Client } = require("whatsapp-web.js");
import { ChatGPTAPI } from 'chatgpt'

// Environment variables
require("dotenv").config()

// Prefix check
const prefixEnabled = process.env.PREFIX_ENABLED == "true"
const prefix = 'g'
const greeting = process.env.GREETING_PROMPT == "true"

//track convos
const conversations = {}

// Whatsapp Client
const client = new Client({puppeteer:{args:['--no-sandbox']}})

// ChatGPT Client
const api = new ChatGPTAPI({
    apiKey: process.env.APIKEY
})

// Entrypoint
const start = async () => {
 

    // Whatsapp auth
    client.on("qr", (qr: string) => {
        console.log("[Whatsapp ChatGPT] Scan this QR code in whatsapp to log in:")
        qrcode.generate(qr, { small: true });
    })

    // Whatsapp ready
    client.on("ready", () => {
        console.log("[Whatsapp ChatGPT] Client is ready!");
    })

    // Whatsapp message
    client.on("message", async (message: any) => {
        if (message.body.length == 0) return
        if (message.from == "status@broadcast") return

        if (prefixEnabled) {
            if (message.body.startsWith(prefix)) {
                // Get the rest of the message
                const prompt = message.body.substring(prefix.length + 1);
                await handleMessage(message, prompt)
            }
        } else {
            await handleMessage(message, message.body)
        }
    })

    client.initialize()
}

const handleMessage = async (message: any, prompt: any) => {
    try {
        const start = Date.now()

        const chat = await message.getChat()
        //if in group but not tagged
        if(chat.isGroup && !message.mentionedIds.includes(client.info.wid._serialized))
        {
        return;
        }

        //existing convo or reset convo?
        if(conversations[message._data.id.remote] === undefined || prompt === "reset")
        {
        console.log("creating new conversation for ${message._data.id.remote}");
        if(prefixEnabled === true)
            {
                if(greeting === true)
                {
                    message.reply("from now on, whenever you type the prefix before your message, you will be chatting with chatgpt instead of me.");
                }
            }        
            else
            { 
                if(greeting === true)
                {
            message.reply("from now on, your messages will be answered by chatgpt");
                }
            } 
       if(prompt === "reset")
        {
        message.reply("conversation reset");
        conversations[message._data.id.remote] = null; //original was return for some reason
        }
        
        }

        // Send the prompt to the API
        console.log("[Whatsapp ChatGPT] Received prompt from " + message.from + ": " + prompt)

var response = null;
if(conversations[message._data.id.remote] !== undefined && conversations[message._data.id.remote] !== null)
{
response = await api.sendMessage(prompt,{conversationId: conversations[message._data.id.remote].conversationId, parentMessageId: conversations[message._data.id.remote].id})
}        
else
{
response = await api.sendMessage(prompt)
}
conversations[message._data.id.remote] = response
        console.log(`[Whatsapp ChatGPT] Answer to ${message.from}: ${response.text}`)

        const end = Date.now() - start

        console.log("[Whatsapp ChatGPT] ChatGPT took " + end + "ms")

        // Send the response to the chat
        message.reply(response.text)
    } catch (error: any) {
        console.error("An error occured", error)
        message.reply("An error occured, please contact the administrator. (" + error.message + ")")
    }
}

start()
