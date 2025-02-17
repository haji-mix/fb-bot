
interface Config {
  name: string;
  aliases: string[];
  info: string;
  usage: string;
  credits: string;
  version: string;
  isPrefix: boolean;
  cd: number;
}

interface RunParams {
  chat: {
    reply: (message: string) => Promise<void>;
    unsend: () => void;
  };
  args: string[];
  font: {
    monospace: (text: string) => string;
    bold: (text: string) => string;
  };
}

export const config: Config = {
  name: 'nega',
  info: 'nega',
  usage: '[prompt]',
  credits: 'Kenneth Panio',
  version: '1.2.5',
  isPrefix: false,
  cd: 5,
};

export const run = async ({ chat, args, font }: RunParams) => {
  chat.reply("fuck you negga")
};
