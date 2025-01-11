const axios = require('axios');
const fs = require('fs');
const path = require('path');
const randomUseragent = require('random-useragent');
const crypto = require('crypto');

module.exports.config = {
    name: "wednesday",
    aliases: ["wed"],
    info: "Wednesday AI",
    usage: "[query]",
    credits: "@AkhiroV2 Owners",
    version: "1.0.0",
    isPrefix: false,
    cd: 5,
};

const conversationFilePath = path.join(__dirname, 'system', 'userData.txt');

if (!fs.existsSync(path.dirname(conversationFilePath))) {
  fs.mkdirSync(path.dirname(conversationFilePath));
}
if (!fs.existsSync(conversationFilePath)) {
  fs.writeFileSync(conversationFilePath, JSON.stringify({}), 'utf-8');
}

function loadConversations() {
  try {
    const data = fs.readFileSync(conversationFilePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveConversations(data) {
  fs.writeFileSync(conversationFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

function formatFont(text) {
  const fontMapping = {
    a: "𝘢", b: "𝘣", c: "𝘤", d: "𝘥", e: "𝘦", f: "𝘧", g: "𝘨", h: "𝘩", i: "𝘪",
    j: "𝘫", k: "𝘬", l: "𝘭", m: "𝘮", n: "𝘯", o: "𝘰", p: "𝘱", q: "𝘲", r: "𝘳",
    s: "𝘴", t: "𝘵", u: "𝘶", v: "𝘷", w: "𝘸", x: "𝘹", y: "𝘺", z: "𝘻",
    A: "𝘈", B: "𝘉", C: "𝘊", D: "𝘋", E: "𝘌", F: "𝘍", G: "𝘎", H: "𝘏", I: "𝘐", J: "𝘑",
    K: "𝘒", L: "𝘓", M: "𝘔", N: "𝘕", O: "𝘖", P: "𝘗", Q: "𝘘", R: "𝘙", S: "𝘚", T: "𝘛",
    U: "𝘜", V: "𝘝", W: "𝘞", X: "𝘟", Y: "𝘠", Z: "𝘡"
  };
  return text.split('').map(char => fontMapping[char] || char).join('');
}

function formatSansText(response) {
  response = response.replace(/\*\*(.*?)\*\*/g, (_, text) => formatFont(text));
  response = response.replace(/\*(.*?)\*/g, (_, text) => formatFont(text));
  return response.replace(/([.!?])(\s+|$)/g, '$1\n').trim();
}

async function queryWednesdayAPI(query, userId) {
  const conversations = loadConversations();
  const userConversation = conversations[userId] || [];

  userConversation.push({ turn: 'user', message: query });

  const data = JSON.stringify({
    context: userConversation.map(conv => ({
      message: conv.message,
      turn: conv.turn,
      media_id: conv.media_id || null
    })),
    strapi_bot_id: "229115",
    output_audio: false,
    enable_proactive_photos: true
  });

  const config = {
    method: 'POST',
    url: 'https://api.exh.ai/chatbot/v4/botify/response',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Content-Type': 'application/json',
      'x-auth-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMGRkYzY3NS01NmU3LTQ3ZGItYmJkOS01YWVjM2Q3OWI2YjMiLCJmaXJlYmFzZV91c2VyX2lkIjoiSGU5azFzMnE3clZJZlJhUU9BU042NzFneFFVMiIsImRldmljZV9pZCI6bnVsbCwidXNlciI6IkhlOWsxczJxN3JWSWZSYVFPQVNONjcxZ3hRVTIiLCJhY2Nlc3NfbGV2ZWwiOiJiYXNpYyIsInBsYXRmb3JtIjoid2ViIiwiZXhwIjoxNzM3MTY5NjY2fQ.S-fPM-PsWKeTOoxX8kNZhPtdV7AHxNuMNc9ViOgnuK0',
      'authorization': 'Bearer eyJhbGciOiJIUzUxMiJ9.eyJ1c2VybmFtZSI6ImJvdGlmeS13ZWItdjMifQ.O-w89I5aX2OE_i4k6jdHZJEDWECSUfOb1lr9UdVH4oTPMkFGUNm9BNzoQjcXOu8NEiIXq64-481hnenHdUrXfg',
    },
    data
  };

  try {
    const response = await axios.request(config);
    const botMessage = response.data.responses[0].response;
    const formattedResponse = formatSansText(botMessage);

    userConversation.push({ turn: 'bot', message: botMessage });
    conversations[userId] = userConversation;
    saveConversations(conversations);

    return formattedResponse || "I'm sorry, I couldn't answer that.";
  } catch (error) {
    return error.message;
  }
}

module.exports.run = async ({
  chat, args, font, event
}) => {
  const mono = txt => font.monospace(txt);
  const prompt = args.join(" ");

  if (!prompt) {
    return chat.reply(mono("Please kindly provide your message!"));
  }

  const answering = await chat.reply(mono("Generating response..."));
  
  try {
    const response = await queryWednesdayAPI(prompt, event.senderID);
    const formattedAnswer = response.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
    answering.unsend();
    chat.reply(formattedAnswer || "I'm sorry, I couldn't answer that.");
  } catch (error) {
    answering.unsend();
    chat.reply(mono(error.message));
  }
};
