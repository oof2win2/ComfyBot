const Command = require("../../base/Command.js"),
  Discord = require("discord.js");

class Wasted extends Command {
  constructor(client) {
    super(client, {
      name: "wasted",
      description: "Generates a \"wasted\" image using Nekobot API",
      usage: "(@member)",
      examples: ["{{p}}wasted", "{{p}}wasted @DistroByte#0001"],
      dirname: __dirname,
      enabled: true,
      guildOnly: false,
      aliases: [],
      memberPermissions: [],
      botPermissions: ["SEND_MESSAGES", "EMBED_LINKS", "ATTACH_FILES"],
      nsfw: false,
      ownerOnly: false,
      cooldown: 5000
    });
  }

  async run(message, args) {

    const user = await this.client.resolveUser(args[0]) || message.author;
    const m = await message.channel.send("Please wait...")
    const buffer = await this.client.AmeAPI.generate("wasted", { url: user.displayAvatarURL({ format: "png", size: 512 }) });
    const attachment = new Discord.MessageAttachment(buffer, "wasted.png");
    m.delete();
    message.channel.send(attachment);
  }
}

module.exports = Wasted;