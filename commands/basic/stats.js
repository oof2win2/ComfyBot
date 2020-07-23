const json = require('../../package.json')
module.exports = {
  config: {
    name: 'stats',
    description: 'Displays some useful stats',
    category: 'basic',
    usage: '',
    accessableby: 'Members',
    aliases: [],
  },
  run: async (bot, message, args) => {
    function duration(ms) {
      const sec = Math.floor((ms / 1000) % 60).toString();
      const min = Math.floor((ms / (1000 * 60)) % 60).toString();
      const hrs = Math.floor((ms / (1000 * 60 * 60)) % 24).toString();
      const days = Math.floor((ms / (1000 * 60 * 60 * 24)) % 60).toString();
      return `${days} days, ${hrs} hrs, ${min} mins, ${sec} secs`;
    }

    let memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    let users = bot.users.cache.size;
    let servers = bot.guilds.cache.size;
    let channels = bot.channels.cache.size
    let nodeVersion = process.version;
    let djsVersion = json.dependencies["discord.js"].slice(1);

    message.channel.send(`\`\`\`apache\n= STATISTICS =\n• Memory Usage   : : ${Math.round(memUsage * 100) / 100} MB\n• Uptime         : : ${duration(bot.uptime)}\n• Total Users    : : ${users}\n• Total Channels : : ${channels}\n• Total Servers  : : ${servers}\n• NodeJS Version : : ${nodeVersion}\n• DJS Version    : : v${djsVersion}\`\`\``);
  },
};

