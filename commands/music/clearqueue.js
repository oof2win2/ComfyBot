module.exports = {
  config: {
    name: 'clearqueue',
    aliases: ['cq'],
    usage: '',
    category: 'music',
    description: 'Clears the current queue',
    accessableby: 'Members',
    permissions: '',
    args: false,
  },
  run: async (client, message, args) => {
    if (!message.member.voice.channel) return message.channel.send(`${client.emotes.error} - You're not in a voice channel!`);

    if (message.guild.me.voice.channel && message.member.voice.channel.id !== message.guild.me.voice.channel.id) return message.channel.send(`${client.emotes.error} - You are not in the same voice channel!`);

    if (!client.player.getQueue(message)) return message.channel.send(`${client.emotes.error} - No music currently playing!`);

    if (client.player.getQueue(message).tracks.length <= 1) return message.channel.send(`${client.emotes.error} - There is only one song in the queue.`);

    client.player.clearQueue(message);

    message.channel.send(`${client.emotes.success} - The queue has just been **removed**!`);
  }
}