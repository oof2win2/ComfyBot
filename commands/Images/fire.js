const Command = require("../../base/Command.js"),
  Discord = require("discord.js");

class Fire extends Command {
  constructor(client) {
    super(client, {
      name: "fire",
      description: "Generates a \"fire\" image using Amethyste API",
      usage: "(@member)",
      examples: ["{{p}}fire\n{{p}}fire @DistroByte#0001"],
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
    const m = await message.channel.send("Please wait...");
    const buffer = await this.client.AmeAPI.generate("fire", { url: user.displayAvatarURL({ format: "png", size: 512 }) });
    const attachment = new Discord.MessageAttachment(buffer, "fire.png");
    m.delete();
    message.channel.send(attachment);
  }
}

module.exports = Fire;