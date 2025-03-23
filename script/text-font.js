const generateFontMappings = (characters, baseCharCode, fontChars) => {
  const mappings = {};
  characters.split('').forEach((char, index) => {
    mappings[char] = fontChars[index];
    mappings[char.toUpperCase()] = fontChars[index].toUpperCase();
  });
  return mappings;
};

const generateNumberMappings = (fontChars) => {
  const mappings = {};
  for (let i = 0; i <= 9; i++) {
    mappings[i.toString()] = fontChars[i] || i.toString();
  }
  return mappings;
};

const fonts = {
  serif: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝐚'.charCodeAt(0), '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳'.split('')),
  gothic: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝖺'.charCodeAt(0), '𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓'.split('')),
  smallcaps: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'ᴀ'.charCodeAt(0), 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ'.split('')),
  bropella: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝖺'.charCodeAt(0), '𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓'.split('')),
  moody: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝐚'.charCodeAt(0), '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳'.split('')),
  italic: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝘢'.charCodeAt(0), '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻'.split('')),
  fancy: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝒂'.charCodeAt(0), '𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛'.split('')),
  doublestruck: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝕒'.charCodeAt(0), '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫'.split('')),
  cursive: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝒶'.charCodeAt(0), '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏'.split('')),
  random: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝓪'.charCodeAt(0), '𝓪𝕓𝓬𝕕𝓮𝓯𝕘𝕙𝓲𝓳𝕜𝓵𝕞𝓷𝕠𝓹𝕢𝓻𝓼𝕥𝓾𝓿𝕨𝕩𝓎𝕫'.split('')),
  beshy: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'a🤸🏽'.charCodeAt(0), 'a🤸🏽b🤸🏽c🤸🏽d🤸🏽e🤸🏽f🤸🏽g🤸🏽h🤸🏽i🤸🏽j🤸🏽k🤸🏽l🤸🏽m🤸🏽n🤸🏽o🤸🏽p🤸🏽q🤸🏽r🤸🏽s🤸🏽t🤸🏽u🤸🏽v🤸🏽w🤸🏽x🤸🏽y🤸🏽z🤸🏽'.split('')),
  emojitext: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '🅰'.charCodeAt(0), '🅰🅱🌜🐬𝓔🔩🐋♓🕴🎷🎉👢Ⓜ🥄😀🅿🍳🌱💲🍄⛎✌🔱❎🏋💤'.split('')),
  textbubbles: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'Ⓐ'.charCodeAt(0), 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ'.split('')),
  fraktur: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝕬'.charCodeAt(0), '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅'.split('')),
  handwriting: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝕬'.charCodeAt(0), '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅'.split('')),
  script: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝑎'.charCodeAt(0), '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧'.split('')),
  blue: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '🇦'.charCodeAt(0), '🇦 🇧 🇨 🇩 🇪 🇫 🇬 🇭 🇮 🇯 🇰 🇱 🇲 🇳 🇴 🇵 🇶 🇷 🇸 🇹 🇺 🇻 🇼 🇽 🇾 🇿'.split(' ')),
  scriptbold: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝒂'.charCodeAt(0), '𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛'.split('')),
  square: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '🄰'.charCodeAt(0), '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉'.split('')),
  widespace: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'ａ'.charCodeAt(0), 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ'.split('')),
  lightshade: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'a░'.charCodeAt(0), 'a░b░c░d░e░f░g░h░i░j░k░l░m░n░o░p░q░r░s░t░u░v░w░x░y░z░'.split('')),
  morsecode: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '·-'.charCodeAt(0), '·- -··· -·-· -·· · ··-· --· ···· ·· ·--- -·- ·-·· -- -· --- ·--· --·- ·-· ··· - ··- ···- ·-- -··- -·-- --··'.split(' ')),
  binarycode: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '01100001'.charCodeAt(0), '01100001 01100010 01100011 01100100 01100101 01100110 01100111 01101000 01101001 01101010 01101011 01101100 01101101 01101110 01101111 01110000 01110001 01110010 01110011 01110100 01110101 01110110 01110111 01111000 01111001 01111010'.split(' ')),
  decimalcode: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '97'.charCodeAt(0), '97 98 99 100 101 102 103 104 105 106 107 108 109 110 111 112 113 114 115 116 117 118 119 120 121 122'.split(' ')),
  sansitalic: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝘢'.charCodeAt(0), '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻'.split('')),
  sansbold: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝗮'.charCodeAt(0), '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇'.split('')),
  bolditalic: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '𝙖'.charCodeAt(0), '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯'.split('')),
  circles: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '🅐'.charCodeAt(0), '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩'.split('')),
  tiny: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'ᵃ'.charCodeAt(0), 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᵠʳˢᵗᵘᵛʷˣʸᶻ'.split('')),
  comic: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'ᗩ'.charCodeAt(0), 'ᗩᗷᑕᗪEᖴGᕼIᒍKᒪᗰᑎOᑭQᖇᔕTᑌᐯᗯ᙭Yᘔ'.split('')),
  clouds: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'a͜͡'.charCodeAt(0), 'a͜͡b͜͡c͜͡d͜͡e͜͡f͜͡g͜͡h͜͡i͜͡j͜͡k͜͡l͜͡m͜͡n͜͡o͜͡p͜͡q͜͡r͜͡s͜͡t͜͡u͜͡v͜͡w͜͡x͜͡y͜͡z͜͡'.split('')),
  special: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '🇦'.charCodeAt(0), '🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯🇰🇱🇲🇳🇴🇵🇶🇷🇸🇹🇺🇻🇼🇽🇾🇿'.split('')),
  manga: generateFontMappings('abcdefghijklmnopqrstuvwxyz', '卂'.charCodeAt(0), '卂乃匚ᗪ乇千Ꮆ卄丨ﾌҜㄥ爪几ㄖ卩Ɋ尺丂ㄒㄩᐯ山乂丫乙'.split('')),
  bubbles: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'ḁͦ'.charCodeAt(0), 'ḁͦb̥ͦc̥ͦd̥ͦe̥ͦf̥ͦg̥ͦh̥ͦi̥ͦj̥ͦk̥ͦl̥ͦm̥ͦn̥ͦo̥ͦp̥ͦq̥ͦr̥ͦs̥ͦt̥ͦu̥ͦv̥ͦw̥ͦx̥ͦy̥ͦz̥ͦ'.split('')),
  underline: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'a̲'.charCodeAt(0), 'a̲b̲c̲d̲e̲f̲g̲h̲i̲j̲k̲l̲m̲n̲o̲p̲q̲r̲s̲t̲u̲v̲w̲x̲y̲z̲'.split('')),
  birds: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'a҈'.charCodeAt(0), 'a҈b҈c҈d҈e҈f҈g҈h҈i҈j҈k҈l҈m҈n҈o҈p҈q҈r҈s҈t҈u҈v҈w҈x҈y҈z҈'.split('')),
  artistic: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'ꪖ'.charCodeAt(0), 'ꪖ᥇ᥴᦔꫀᠻᧁꫝ𝓲𝓳𝘬ꪶꪑꪀꪮρ𝘲𝘳𝘴𝓽ꪊꪜ᭙᥊ꪗɀ'.split('')),
  baloon: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'ⓐ̣̣̣'.charCodeAt(0), 'ⓐ̣̣̣ⓑ̣̣̣ⓒ̣̣̣ⓓ̣̣̣ⓔ̣̣̣ⓕ̣̣̣ⓖ̣̣̣ⓗ̣̣̣ⓘ̣̣̣ⓙ̣̣̣ⓚ̣̣̣ⓛ̣̣̣ⓜ̣̣̣ⓝ̣̣̣ⓞ̣̣̣ⓟ̣̣̣ⓠ̣̣̣ⓡ̣̣̣ⓢ̣̣̣ⓣ̣̣̣ⓤ̣̣̣ⓥ̣̣̣ⓦ̣̣̣ⓧ̣̣̣ⓨ̣̣̣ⓩ̣̣̣'.split('')),
  notes: generateFontMappings('abcdefghijklmnopqrstuvwxyz', 'ᾰ'.charCodeAt(0), 'ᾰ♭ḉᖱḙḟ❡ℏ!♩кℓՊℵ✺℘ǭԻṧтṳṽω✘⑂ℨ'.split('')),
};

const pageSize = 15;

const generateFontList = (page) => {
  const fontList = Object.keys(fonts).slice((page - 1) * pageSize, page * pageSize);
  return fontList.map(font => `⊂⊃ ➥${font}`).join('\n');
};

const totalPages = Math.ceil(Object.keys(fonts).length / pageSize);

const generateListMessage = (page) => {
  const fontList = generateFontList(page);
  return `
♡   ∩_∩
     („• ֊ •„)♡
┏━━━━━∪∪━━━━━━━━┓
♡   List Of Fonts  ♡ 
┗━━━━━━━━━━━━━━━━━┛
${fontList}
━━━━━━━━━━━━━━━━━━━━━━━
━━TOTAL FONTS: ${Object.keys(fonts).length} ━━
━━Use #font list <page> to see more fonts (Page ${page}/${totalPages})━━
━━━━`;
};

module.exports["config"] = {
  name: 'font',
  version: '1.1.0',
  role: 0,
  credits: "Marjhun Baylon and Miko Mempin",
  info: 'Converts text into any Font',
  type: 'text',
  usage: '<fontType> <input>',
  guide: 'Font italic hello world\n\nResult: 𝘩𝘦𝘭𝘭𝘰 𝘸𝘰𝘳𝘭𝘥',
  cd: 5,
};

module.exports["run"] = async ({ event, api, args, prefix }) => {
  const { threadID, messageID } = event;
  
  if (args.length === 0 || args[0].toLowerCase() === 'list') {
    const page = args.length > 1 ? parseInt(args[1]) || 1 : 1;
    return api.sendMessage(generateListMessage(page), threadID, messageID);
  }

  const fontType = args[0].toLowerCase();
  const inputText = args.slice(1).join(' ');
  
  if (!inputText) return api.sendMessage('Please provide text to convert. e.g: ' + module.exports.config.guide, threadID, messageID);

  const fontMap = fonts[fontType];

  if (!fontMap) {
    return api.sendMessage(`Invalid font type '${fontType}'. Use font list <page> to see available fonts.`, threadID, messageID);
  }

  const outputText = inputText
    .split('')
    .map(char => fontMap[char] || char)
    .join('');

  return api.sendMessage(outputText, threadID, messageID);
};