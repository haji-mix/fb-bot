export default {
  name: "bruh",
  description: "testing purpose",
  async onStart({ chat, args, fonts }: any) {
    chat.send(fonts.bold("bruh"));
  }
};