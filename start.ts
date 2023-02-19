
import { ChatGPTAPI } from 'chatgpt';
require("dotenv").config();
const process = require("process");
const qrcode = require("qrcode-terminal");
const { Client } = require("whatsapp-web.js");
const fs = require("fs");
const log = (wamessage:any,message:string, silent:boolean = true) => {
   
    if(!silent){console.log(message);} 
    
    if (!fs.existsSync(`./logs/${wamessage._data.id.remote}_log.txt`)) {
        fs.writeFile(`./logs/${wamessage._data.id.remote}_log.txt`,`${wamessage._data.notifyName} [${wamessage._data.id.remote}]: \n`+message, (err) => err && console.error(err));
    }
    else
    {    
        fs.appendFile(`./logs/${wamessage._data.id.remote}_log.txt`,`${wamessage._data.notifyName} [${wamessage._data.id.remote}]: \n`+message, (err) => err && console.error(err));

    }
};
const client = new Client({puppeteer:{args:['--no-sandbox']}});
const api = new ChatGPTAPI({apiKey: process.env.APIKEY, debug: false});
//convo tracking
var conversations = {}
//settings tracking
var settings = {}

//preconfig prompt
var maximumPrompt = null;

// if the user should only talk to the bot using a prefix
const prefixEnabled = process.env.PREFIX_ENABLED == "true";

//what the prefix should be
const prefix = 'g';

//if there should be a greeting prompt on first contact, e.g. to introduce the bot / warn the user that a bot is talking to them
const greeting = process.env.GREETING_PROMPT == "true";

//settings for the application that are injected into the conversation object
const settingsproperty = 'wagpt-settings';
const settingsdefault = {groupprefix: 'm78', groupadmin: '4917621724392'}

//logging helper
var systemMessage = {_data: {id: {remote: 'system'}}};

// Entrypoint
const start = async () => {
    log(systemMessage, 'initializing: logs directory')
    
    if (!fs.existsSync("./log")) {
        log(systemMessage, 'initializing: logs directory does not exist, creating')
        fs.mkdirSync('./log');
    }


    log(systemMessage,'initializing: reading convo memory',false);
    var convoRaw = '';
    if (fs.existsSync("./conversationmemory.txt")) {
        convoRaw = fs.readFileSync("./conversationmemory.txt");
    }
    var settingsRaw = '';
    if (fs.existsSync("./conversationsettings.txt")) {
       settingsRaw =  fs.readFileSync("./conversationsettings.txt");
    }
    
    log(systemMessage, 'loading existing convo from fs',false);
    if(isJsonString(convoRaw))
    {
        log(systemMessage, 'is valid',false);
        conversations = JSON.parse(convoRaw);
        log(systemMessage,'convo memory: ' + convoRaw);
    }
    else
    {
    log(systemMessage, 'existing convo memory was invalid, resetting',false);
    
    conversations = {};
    if (fs.existsSync("./conversationmemory.txt")) {
        fs.rename("./conversationmemory.txt", `./conversationmemory_${(new Date().toJSON().slice(0,10))}.txt`, () => {
            console.log("\nBACKUP OF ORIGINAL CONVERSATION MEMORY CREATED\n");
          });
      }
    
         
    }

    log(systemMessage, 'loading existing settings from fs',false);
    if(isJsonString(settingsRaw))
    {
        log(systemMessage, 'is valid',false);
        settings = JSON.parse(settingsRaw);
        log(systemMessage,'settings memory: ' + settingsRaw);
    }
    else
    {
    log(systemMessage, 'existing settings memory was invalid, resetting',false);
    
    settings = {};
    if (fs.existsSync("./conversationsettings.txt")) {
        fs.rename("./conversationsettings.txt", `./conversationsettings${(new Date().toJSON().slice(0,10))}.txt`, () => {
            console.log("\nBACKUP OF ORIGINAL SETTINGS MEMORY CREATED\n");
          });
      }
    
         
    }


    log(systemMessage,'initializing: reading maximum prompt',false);
    maximumPrompt =  fs.readFileSync("./configprompt.txt");

    // Whatsapp auth
    client.on("qr", (qr: string) => {
        log(systemMessage,"[Whatsapp ChatGPT] Scan this QR code in whatsapp to log in:",false)
        qrcode.generate(qr, { small: true });
    })

    // Whatsapp ready
    client.on("ready", () => {
        log(systemMessage,"[Whatsapp ChatGPT] Client is ready!",false);
    })

    // Whatsapp message
    client.on("message", async (message: any) => {
        log(systemMessage,"[Whatsapp ChatGPT] message retrieved",false);
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
    log(systemMessage,'initialization finished',false);
}

const handleMessage = async (message: any, prompt: any) => {
    try {
        const remoteId = message._data.id.remote;
        const remoteName = message._data.notifyName;
        const start = Date.now()
        const chat = await message.getChat()

        log(message,'PROMPT: ' + prompt,false);

        //log(message, conversations[remoteId],false);
        if(conversations[remoteId])
        {
            log(message, 'entered settingsprop validation',false);
                if(settings[remoteId]) //if the settings object has been initialized
                {
                    log(message, 'success',false);
                    var mk_cont = parseIfCommand(message, prompt, remoteId);
                    if(mk_cont == false){return;} //when parseifcommand is false, it means it wants you to exit the whole thing
                   

                    

                    if(chat.isGroup && (settings[remoteId].groupprefix !== 'none')) //if groupprefix is not unset
                    {
                        if(!prompt.toLowerCase().startsWith(settings[remoteId].groupprefix)) //and the message does not contain the prefix
                        {
                            if(!message.mentionedIds.includes(client.info.wid._serialized)) //you must at least directly talk to the bot
                            {
                            return; //or we will ignore the message
                            }
                        }
                    }
                }
        }

                    //trial: try to enhance prompt with wa-web data, this is defined in the enhanced the maximum prompt
                    prompt = '[Name: ' + remoteName + '] ' + prompt;

        //existing convo or reset convo? any user can reset his own personal conversation
        if(conversations[remoteId] === undefined || prompt === "reset")
        {
            log(message, 'entered existing convo/reset flow',false);
                log(message,"creating new conversation for ${remoteId}");

                if(prompt === "reset")
                    {
                    message.reply("conversation reset");
                    conversations[remoteId] = null; 
                }
                // config CGPT as MAXIMUM in the background
                
                    log(message, 'entered preconfiguration',false);
                                var preConfigResponse = null;
                                preConfigResponse = await api.sendMessage(maximumPrompt);
                                conversations[remoteId] = preConfigResponse;
                                
                    log(message, 'conversation preconfig is set',false);
                    settings[remoteId] = settingsdefault;
                    log(message, 'settingsdefault is set',false);
                // end
               prefixIfSet(message);
                
               if(chat.isGroup) //do not talk to anyone if initialized in a group, its unlikely that someone was spreaking to the bot
               {
                   return;
               }
        }

        log(message, 'entered standard flow',false);
        // Send the prompt to the API
        log(message,"[Whatsapp ChatGPT] Received prompt from " + message.from + ": " + prompt)

        var response = null;
        if(conversations[remoteId] !== undefined && conversations[remoteId] !== null)
        {
            response = await api.sendMessage(prompt,{conversationId: conversations[remoteId].conversationId, parentMessageId: conversations[remoteId].id})
        }        
        else
        {
            response = await api.sendMessage(prompt)
        }
        conversations[remoteId] = response
        log(message,`[API ANSWER] \n ${response.text}`)

        const end = Date.now() - start

        log(message,"[Whatsapp ChatGPT] ChatGPT took " + end + "ms")

        // Send the response to the chat
        message.reply(response.text)

        log(systemMessage,'updating conversation memory');
        fs.writeFile("./conversationmemory.txt",JSON.stringify(conversations), (err) => err && console.error(err));
        fs.writeFile("./conversationsettings.txt",JSON.stringify(settings), (err) => err && console.error(err));
    } catch (error: any) {
        console.error("An error occured", error)
        message.reply("An error occured, please contact the administrator on whatsapp @ +4917621724392. (" + error.message + ")")
        message.reply("This error can be due to high-traffic on the OpenAi API, downtime of our server or maintenance/update procedures and security enhancements.");
        message.reply("Try again later!");
    }
}

function isJsonString(str) {
    log(systemMessage,'isjsonstring');
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

function prefixIfSet(message) : void
{
    log(systemMessage,'prefixisseet');
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
}


function parseIfCommand(message, prompt, remoteId) : boolean
{
    log(message,'checking prompt: ' + prompt + ' for commands', false);
    log(message,'SETTINGS: ' + JSON.stringify(settings[remoteId]), false);
    log(message,JSON.stringify(message), false);
    
    if(settings[remoteId].groupadmin !== 'none')
    {
        log(message,"the existing groupadmin is: " +settings[remoteId].groupadmin,false)
        var participant = message._data.id.participant.split('@')[0];
        log(message,"the participant is: " + participant,false)
        
        if(participant != settings[remoteId].groupadmin)
        {
            return true; //if an admin is configured, and this user is not admin, skip all of this
        }
    }
    if(prompt.toLowerCase().startsWith('/reload'))
    {
        message.reply('reloading convo memory');
        var convoRaw = fs.readFileSync("./conversationmemory.txt");
            if(isJsonString(convoRaw))
            {
                conversations = JSON.parse(convoRaw);
            }
        return false;
    }
    if(prompt.toLowerCase().startsWith('/set admin')) 
    {
        message.reply('setting admin');
        var admn = prompt.split(' ')[2]
        log(message,'[/set admin] TO [' + admn +']' );
        settings[remoteId].groupadmin = admn;
        message.reply('[/set admin] TO [' + admn +']');
        return false;
    }
    if(prompt.toLowerCase().startsWith('/set groupprefix')) 
    {
        message.reply('setting groupprefix');
        var gpre = prompt.split(' ')[2]
        log(message,'[/set groupprefix] TO [' + gpre +']' );
        settings[remoteId].groupprefix = gpre;
        message.reply('[/set groupprefix] TO [' + gpre +']');
        return false;
    }
    if(prompt.toLowerCase().startsWith('/debug')) 
    {
        log(message,'requested /debug');
        message.reply('retrieving debug');
        const debugobj = {conversations: conversations, message: message};
        message.reply(JSON.stringify('DEBUG: \n' + debugobj));
        return false;
    }
    if(prompt.toLowerCase().startsWith('/memory'))
    {
        log(message,'requested /memory');
        message.reply('retrieving memory');
        var convoRaw = fs.readFileSync("./conversationmemory.txt");
        message.reply(JSON.stringify('MEMORY: \n' + convoRaw));
        return false;
    }
    if(prompt.toLowerCase().startsWith('/settings'))
    {
        log(message,'requested /settings');
        message.reply('retrieving memory');
        var settingsRaw = fs.readFileSync("./conversationsettings.txt");
        message.reply(JSON.stringify('Settings: \n' + settingsRaw));
        return false;
    }
    if(prompt.toLowerCase().startsWith('/history'))
    {
        log(message,'requested /history');
        message.reply('retrieving history');
        fs.readdir('./logs', (err, files) => {
            files.forEach(file => {
              log(systemMessage,file);
              var history = fs.readFileSync(file);
              message.reply(JSON.stringify('HISTORY: \n' + history));
              message.reply('[DONE]');
            });
          });
        return false;
    }
    if(prompt.toLowerCase().startsWith('/clear history'))
    {
        log(message,'requested /clear history');
        message.reply('clearing history');
        if (fs.existsSync("./conversationmemory.txt")) {
            fs.rename("./conversationmemory.txt", `./conversationmemory_${(new Date().toJSON().slice(0,10))}.txt`, () => {
                console.log("\nBACKUP OF ORIGINAL CONVERSATION MEMORY CREATED\n");
              });
          }
        conversations = {};
        
        message.reply('done');
        return false;
    }
    if(prompt.toLowerCase().startsWith('/save')) 
    {
        log(message,'requested /save');
        fs.writeFile("./conversationmemory.txt",JSON.stringify(conversations), (err) => err && console.error(err));
        fs.writeFile("./conversationsettings.txt",JSON.stringify(settings), (err) => err && console.error(err));
        message.reply('saved current state to memory');
        return false;
    }
    if(prompt.toLowerCase().startsWith('/reload')) 
    {
        log(message,'requested /reload');
        var convoRaw = '';
        if (fs.existsSync("./conversationmemory.txt")) {
            convoRaw = fs.readFileSync("./conversationmemory.txt");
        }
        var settingsRaw = '';
        if (fs.existsSync("./conversationsettings.txt")) {
           settingsRaw =  fs.readFileSync("./conversationsettings.txt");
        }
        
        log(systemMessage, 'loading existing convo from fs',false);
        if(isJsonString(convoRaw))
        {
            log(systemMessage, 'is valid',false);
            conversations = JSON.parse(convoRaw);
            log(systemMessage,'convo memory: ' + convoRaw);
        }
        else
        {
        log(systemMessage, 'existing convo memory was invalid, resetting',false);
        
        conversations = {};
        if (fs.existsSync("./conversationmemory.txt")) {
            fs.rename("./conversationmemory.txt", `./conversationmemory_${(new Date().toJSON().slice(0,10))}.txt`, () => {
                console.log("\nBACKUP OF ORIGINAL CONVERSATION MEMORY CREATED\n");
              });
          }
        
             
        }
    
        log(systemMessage, 'loading existing settings from fs',false);
        if(isJsonString(settingsRaw))
        {
            log(systemMessage, 'is valid',false);
            settings = JSON.parse(settingsRaw);
            log(systemMessage,'settings memory: ' + settingsRaw);
        }
        else
        {
        log(systemMessage, 'existing settings memory was invalid, resetting',false);
        
        settings = {};
        if (fs.existsSync("./conversationsettings.txt")) {
            fs.rename("./conversationsettings.txt", `./conversationsettings${(new Date().toJSON().slice(0,10))}.txt`, () => {
                console.log("\nBACKUP OF ORIGINAL SETTINGS MEMORY CREATED\n");
              });
          }
        
             
        }
    
        message.reply('loaded current state to memory');
        return false;
    }

    log(message,'no command detected', false);
return true;
}


start();


