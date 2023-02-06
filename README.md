NOTE, THIS IS A HEAVILY IMPROVED VERSION OF navopw's https://github.com/navopw/whatsapp-chatgpt
SINCE AT THE TIME OF CREATING THIS REPOSITORY, THE ORIGINAL SOURCES DID NOT ALLOW FOR THE TOKEN AUTH FLOW
OR GROUPS, OR TRACKED CONVERSATIONS

It also contains ideas from pascalroget https://github.com/pascalroget/whatsgpt which provided the general flow for conversation tracking


# Whatspp to ChatGPT API Connector (via whatsapp-web.js)

This connector uses whatsapp-web.js to connect your whatsapp number to chatgpt from openAi.
It is possible to directly chat with the number and have cgpt respond, alternatively, you can set a prefix.
The prefix is just a "g" in front of your actual message.

You can also add the number to a whatsapp group so the group can chat with the bot.

The "bot" also tracks conversations, any number that chats with it will have its own context, so it can store
names, preferences and other things about the conversation history.


## Requirements

- NPM
- Node.js
- OPEN-API Access (token)

## The env file has to be at the root of the folder structure and contain these:

```
APIKEY=your_email
PREFIX_ENABLED=true
```

## Installation

1. Clone this repository
2. Install the required packages by running `npm install`
3. Put your DATA into the .env File (`APIKEY`, `PREFIX_ENABLED`)
4. Run the bot using `npm run start`
5. Scan the QR Code with Whatsapp (Link a device)
6. Now you're ready to go :)

## Usage

To use the bot, simply send a message with `g` command followed by your prompt. For example:

`g What is the meaning of life?`

The bot only responds to messages that are received by you, not sent.

## Used libraries
- https://github.com/pedroslopez/whatsapp-web.js
- https://github.com/transitive-bullshit/chatgpt-api
