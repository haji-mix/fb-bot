
const axios = require('axios');

const config = {
    name: 'pinterest',
    version: '0.0.1',
    isPrefix: false,
    info: 'search pictures on Pinterest',
    usage: '[query] - [1 to 8]',
    role: 0,
    isPremium: true,
    limit: 35,
    aliases: ['pin', 'picture', 'photo', 'pinte'],
};

const run = async ({ event, args, chat, font }) => {
    const reply = async (msg, unsendTime = 5000) => {
        const msgInfo = await chat.reply(msg);
        if (unsendTime > 0) msgInfo.unsend(unsendTime);
    };

    // Check if a query is provided
    const query = args.join(' ').trim();
    if (!query) {
        return await reply(font.thin('A query is required! Please provide a search term.'));
    }

    const name = query.split('-')[0];
    const number = parseInt(query.split('-')[1]) || 6;

    if (number > 10) {
        return await reply(font.thin('Number of limit exceeds maximum allowed (10)!'));
    } else {
        await reply(font.thin(`Sending ${number} pinterest pictures wait a few seconds...`));
    }

    const headers = {
        authority: 'www.pinterest.com',
        'cache-control': 'max-age=0',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'sec-gpc': '1',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'same-origin',
        'sec-fetch-dest': 'empty',
        'accept-language': 'en-US,en;q=0.9',
        cookie: 'csrftoken=92c7c57416496066c4cd5a47a2448e28; g_state={"i_l":0}; _auth=1; _pinterest_sess=TWc9PSZBMEhrWHJZbHhCVW1OSzE1MW0zSkVid1o4Uk1laXRzdmNwYll3eEFQV0lDSGNRaDBPTGNNUk5JQTBhczFOM0ZJZ1ZJbEpQYlIyUmFkNzlBV2kyaDRiWTI4THFVUWhpNUpRYjR4M2dxblJCRFhESlBIaGMwbjFQWFc2NHRtL3RUcTZna1c3K0VjVTgyejFDa1VqdXQ2ZEQ3NG91L1JTRHZwZHNIcDZraEp1L0lCbkJWUytvRis2ckdrVlNTVytzOFp3ZlpTdWtCOURnbGc3SHhQOWJPTzArY3BhMVEwOTZDVzg5VDQ3S1NxYXZGUEEwOTZBR21LNC9VZXRFTkErYmtIOW9OOEU3ektvY3ZhU0hZWVcxS0VXT3dTaFpVWXNuOHhiQWdZdS9vY24wMnRvdjBGYWo4SDY3MEYwSEtBV2JxYisxMVVsV01McmpKY0VOQ3NYSUt2ZDJaWld6T0RacUd6WktITkRpZzRCaWlCTjRtVXNMcGZaNG9QcC80Ty9ZZWFjZkVGNURNZWVoNTY4elMyd2wySWhtdWFvS2dQcktqMmVUYmlNODBxT29XRWx5dWZSc1FDY0ZONlZJdE9yUGY5L0p3M1JXYkRTUDAralduQ2xxR3VTZzBveUc2Ykx3VW5CQ0FQeVo5VE8wTEVmamhwWkxwMy9SaTNlRUpoQmNQaHREbjMxRlRrOWtwTVI5MXl6cmN1K2NOTFNyU1cyMjREN1ZFSHpHY0ZCR1RocWRjVFZVWG9VcVpwbXNGdlptVzRUSkNadVc1TnlBTVNGQmFmUmtrNHNkVEhXZytLQjNUTURlZXBUMG9GZ3YwQnVNcERDak16Nlp0Tk13dmNsWG82U2xIKyt5WFhSMm1QUktYYmhYSDNhWnB3RWxTUUttQklEeGpCdE4wQlNNOVRzRXE2NkVjUDFKcndvUzNMM2pMT2dGM05WalV2QStmMC9iT055djFsYVBKZjRFTkRtMGZZcWFYSEYvNFJrYTZSbVRGOXVISER1blA5L2psdURIbkFxcTZLT3RGeGswSnRHdGNpN29KdGFlWUxtdHNpSjNXQVorTjR2NGVTZWkwPSZzd3cwOXZNV3VpZlprR0VBempKdjZqS00ybWM9; _b="AV+pPg4VpvlGtL+qN4q0j+vNT7JhUErvp+4TyMybo+d7CIZ9QFohXDj6+jQlg9uD6Zc="; _routing_id="d5da9818-8ce2-442"',
    };

    try {
        const response = await axios.get(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(name)}&rs=typed&term_meta[]=${encodeURIComponent(name)}%7Ctyped`, { headers });
        if (response.status === 200) {
            const arrMatch = response.data.match(/https:\/\/i\.pinimg\.com\/originals\/[^.]+\.jpg/g);
            const imgabc = [];
            for (let i = 0; i < number && i < arrMatch.length; i++) {
                imgabc.push(axios.get(arrMatch[i], { responseType: 'stream' }).then(res => res.data));
            }
            const images = await Promise.all(imgabc);
            const msg = { attachment: images };
            await reply(msg, 60000);
        } else {
            await reply(font.thin(`Failed to send image. Something went wrong! ${response.status}`));
        }
    } catch (error) {
            chat.error(error.message);
            await reply(font.thin(error.message || 'Bot is temporarily blocked by Facebook and can\'t use this feature!'));
    }
};

module.exports = { config, run };
