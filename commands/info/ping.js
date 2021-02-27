module.exports = {
  config: {
    name: 'ping',
    description: 'PONG! Displays the api & bot latency',
    category: 'info',
  },
  run: async (client, message, args) => {
    message.channel.send('Pinging...').then((m) => {
      let ping = m.createdTimestamp - message.createdTimestamp;

      m.edit(`Bot Latency: ${ping}ms. API Latency: ${Math.round(client.ws.ping)}ms`);
    });
  },
};
