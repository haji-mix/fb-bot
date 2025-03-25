const morse = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
  'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
  'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  ' ': '/', '.': '.-.-.-', ',': '--..--', '?': '..--..', '\'': '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...',
  ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
};

const reverseMorse = Object.fromEntries(Object.entries(morse).map(([k, v]) => [v, k]));

function textToMorse(text) {
  return text.toUpperCase().split('').map(char => morse[char] || char).join(' ');
}

function morseToText(morseCode) {
  return morseCode.split(' ').map(code => reverseMorse[code] || code).join('');
}

module.exports["config"] = {
  name: "morsecode",
  aliases: ['morse', 'mc'],
  type: 'Tools',
  version: "1.1.0",
  role: 1,
  info: "Encode and decode Morse code",
  usage: "encode [text] or decode [morse code]",
  guide: "Encode text to Morse code: mc encode Hello\nDecode Morse code to text: mc decode .... . .-.. .-.. ---",
  credits: "Developer",
};

module.exports["run"] = async ({ chat, event, args, prefix, font }) => {
  if (args.length < 1 && event.type !== "message_reply") {
    return chat.reply(font.monospace(`Please provide an action (encode/decode) and the text, or reply to a message.\n\nExample: ${prefix}mc encode Hello`));
  }

  const action = args[0]?.toLowerCase();
  let content = font.origin(args.slice(1).join(" "));

  if (event.type === "message_reply") {
    content = font.origin(event.messageReply.body);
  }

  if (!content) {
    return chat.reply(font.monospace(`Please provide text to encode/decode.\n\nExample: ${prefix}mc encode Hello`));
  }

  if (action === 'encode' || action === 'enc') {
    const morseCode = textToMorse(content);
    return chat.reply(morseCode);
  } else if (action === 'decode' || action === 'dec') {
    const text = morseToText(content);
    return chat.reply(text);
  } else {
    return chat.reply(font.monospace(`Invalid action. Please use "encode" or "decode".\n\nExample: ${prefix}mc encode Hello`));
  }
};
