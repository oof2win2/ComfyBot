const Command = require("../../base/Command.js"),
  Resolvers = require("../../helpers/resolvers");

class Setreports extends Command {

  constructor(client) {
    super(client, {
      name: "setreports",
      description: "Set the reports channel!",
      usage: '(#channel)',
      examples: ['{{p}}setreports #reports', '{{p}}setreports'],
      dirname: __dirname,
      enabled: true,
      guildOnly: true,
      aliases: ["setreport"],
      memberPermissions: ["MANAGE_GUILD"],
      botPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      nsfw: false,
      ownerOnly: false,
      cooldown: 3000
    });
  }

  async run(message, args, data) {

    const areReportsEnabled = Boolean(data.guild.plugins.reports);
    const sentChannel = await Resolvers.resolveChannel({
      message,
      search: args.join(" "),
      channelType: "text"
    });

    if (!sentChannel && areReportsEnabled) {
      data.guild.plugins.reports = null;
      data.guild.markModified("plugins.reports");
      await data.guild.save();
      return message.channel.send("Reports channel no longer set!");
    } else {
      const channel = sentChannel || message.channel;
      data.guild.plugins.reports = channel.id;
      data.guild.markModified("plugins.reports");
      await data.guild.save();
      return message.channel.send(`Reports will be sent in **${channel.toString()}**`);
    }
  }
}

module.exports = Setreports;
