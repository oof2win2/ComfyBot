const { Client, Collection, MessageEmbed } = require('discord.js');
const { GiveawaysManager } = require('discord-giveaways');
const { Player } = require('discord-player');

const util = require('util'),
  path = require('path'),
  AmeClient = require("amethyste-api"),
  moment = require('moment');

class Comfy extends Client {
  constructor(options) {
    super(options)
    this.config = require('../config');
    this.emotes = this.config.emojis;

    this.commands = new Collection();
    this.aliases = new Collection();

    this.logger = require('../helpers/logger');
    this.functions = require('../helpers/functions');
    this.wait = util.promisify(setTimeout);

    this.guildsData = require('./Guild');
    this.usersData = require('./User');
    this.membersData = require('./Member');
    this.logs = require('./Log');

    this.queues = new Collection();

    this.dashboard = require('../dashboard/app');
    this.states = {};

    this.knownGuilds = []

    this.databaseCache = {};
    this.databaseCache.users = new Collection();
    this.databaseCache.guilds = new Collection();
    this.databaseCache.members = new Collection();
    this.databaseCache.usersReminds = new Collection();
    this.databaseCache.mutedUsers = new Collection();

    this.authCodes = new Map();

    this.AmeAPI = new AmeClient(this.config.apiKeys.amethyste);

    this.player = new Player(this, { leaveOnEmpty: false });
    this.filters = this.config.filters
    this.player
      .on('trackStart', (message, track) => {
        message.channel.send(`${this.emotes?.music} - Now playing ${track.title} into \`${message.member.voice.channel.name}\``);
      })
      .on('playlistStart', (message, queue, playlist, track) => {
        message.channel.send(this.emotes?.success + ' | ' + message.translate('music/play:PLAYING_PLAYLIST', {
          playlistTitle: playlist.title,
          playlistEmoji: this.customEmojis.playlist,
          songName: track.title
        }));
      })
      .on('searchResults', (message, query, tracks) => {
        if (tracks.length > 20) tracks = tracks.slice(0, 20);
        message.channel.send({
          embed: {
            color: 'BLUE',
            author: { name: `Here are your search results for ${query}` },
            timestamp: new Date(),
            description: `${tracks.map((t, i) => `**${i + 1}** - ${t.title}`).join('\n')}`,
          },
        });
      })
      .on('searchInvalidResponse', (message, query, tracks, content, collector) => {
        if (content === 'cancel') {
          collector.stop();
          return message.channel.send(`${this.emotes?.success} - The selection has been **cancelled**!`);
        } else message.channel.send(`${this.emotes?.error} - You must send a valid number between **1** and **${tracks.length}**!`);

      })
      .on('searchCancel', (message) => {
        message.channel.send(`${this.emotes?.error} - You did not provide a valid response. Please send the command again!`);
      })
      .on('botDisconnect', (message) => {
        message.channel.send(`${this.emotes?.error} - Music stopped as I have been disconnected from the channel!`);
      })
      .on('noResults', (message) => {
        message.channel.send(`${this.emotes?.error} - No results found on YouTube for ${query}!`);
      })
      .on('queueEnd', (message) => {
        message.channel.send(`${this.emotes?.error} - No more music in the queue!`);
      })
      .on('playlistAdd', (message, queue, playlist) => {
        message.channel.send(`${this.emotes?.music} - ${playlist.title} has been added to the queue (**${playlist.tracks.length}** songs)!`);
      })
      .on('trackAdd', (message, queue, track) => {
        message.channel.send(`${this.emotes?.music} - ${track.title} has been added to the queue!`);
      })
      .on('channelEmpty', () => {
        // message.channel.send(`${client.emotes?.error} - Music stopped as there is no more member in the voice channel!`);
        // leaveOnEmpty disabled, will do nothing
      })
      .on('error', (message, error) => {
        switch (error) {
          case 'NotPlaying':
            message.channel.send(`${this.emotes?.error} - There is no music being played on this server!`);
            break;
          case 'NotConnected':
            message.channel.send(`${this.emotes?.error} - You are not connected in any voice channel!`);
            break;
          case 'UnableToJoin':
            message.channel.send(`${this.emotes?.error} - I am not able to join your voice channel, please check my permissions!`);
            break;
          case 'VideoUnavailable':
            message.channel.send(`${this.emotes?.error} - ${args[0].title} is not available in your country! Skipping!`);
            break;
          case 'MusicStarting':
            message.channel.send(`The music is starting! please wait and retry!`);
            break;
          default:
            message.channel.send(`${this.emotes?.error} - Something went wrong. Error: ${error}`);
        };
      });

    this.giveawaysManager = new GiveawaysManager(this, {
      storage: './giveaways.json',
      updateCountdownEvery: 10000,
      default: {
        botsCanWin: false,
        exemptPermissions: ['MANAGE_MESSAGES', 'ADMINISTRATOR'],
        embedColor: '#FF0000',
        reaction: '🎉'
      }
    });
  }

  printDate(date, format) {
    return moment(new Date(date))
      .locale('UTC')
      .format('hh:mm a, DD-MM-YYYY');
  }

  loadCommand(commandPath, commandName) {
    try {
      const props = new (require(`.${commandPath}${path.sep}${commandName}`))(this);
      props.conf.location = commandPath;
      if (props.init) {
        props.init(this);
      }
      this.commands.set(props.help.name, props);
      props.help.aliases.forEach((alias) => {
        this.aliases.set(alias, props.help.name);
      });
      return false;
    } catch (e) {
      return `Unable to load command ${commandName}: ${e}`;
    }
  }

  async unloadCommand(commandPath, commandName) {
    let command;
    if (this.commands.has(commandName)) {
      command = this.commands.get(commandName);
    } else if (this.aliases.has(commandName)) {
      command = this.commands.get(this.aliases.get(commandName));
    }
    if (!command) {
      return `The command \`${commandName}\` doesn't seem to exist, nor is it an alias. Try again!`;
    }
    if (command.shutdown) {
      await command.shutdown(this);
    }
    delete require.cache[require.resolve(`.${commandPath}${path.sep}${commandName}.js`)];
    return false;
  }

  async findOrCreateGuild({ id: guildID }, isLean) {
    if (this.databaseCache.guilds.get(guildID)) {
      return isLean ? this.databaseCache.guilds.get(guildID).toJSON() : this.databaseCache.guilds.get(guildID);
    } else {
      let guildData = (isLean ? await this.guildsData.findOne({ id: guildID }).populate('members').lean() : await this.guildsData.findOne({ id: guildID }).populate('members'));
      if (guildData) {
        if (!isLean) this.databaseCache.guilds.set(guildID, guildData);
        return guildData;
      } else {
        guildData = new this.guildsData({ id: guildID });
        await guildData.save();
        this.databaseCache.guilds.set(guildID, guildData);
        return isLean ? guildData.toJSON() : guildData;
      }
    }
  }

  async findOrCreateMember({ id: memberID, guildID }, isLean) {
    if (this.databaseCache.members.get(`${memberID}${guildID}`)) {
      return isLean ? this.databaseCache.members.get(`${memberID}${guildID}`).toJSON() : this.databaseCache.members.get(`${memberID}${guildID}`);
    } else {
      let memberData = (isLean ? await this.membersData.findOne({ guildID, id: memberID }).lean() : await this.membersData.findOne({ guildID, id: memberID }));
      if (memberData) {
        if (!isLean) this.databaseCache.members.set(`${memberID}${guildID}`, memberData);
        return memberData;
      } else {
        memberData = new this.membersData({ id: memberID, guildID: guildID });
        await memberData.save();
        const guild = await this.findOrCreateGuild({ id: guildID });
        if (guild) {
          guild.members.push(memberData._id);
          await guild.save();
        }
        this.databaseCache.members.set(`${memberID}${guildID}`, memberData);
        return isLean ? memberData.toJSON() : memberData;
      }
    }
  }

  async findOrCreateUser({ id: userID }, isLean) {
    if (this.databaseCache.users.get(userID)) {
      return isLean ? this.databaseCache.users.get(userID).toJSON() : this.databaseCache.users.get(userID);
    } else {
      let userData = (isLean ? await this.usersData.findOne({ id: userID }).lean() : await this.usersData.findOne({ id: userID }));
      if (userData) {
        if (!isLean) this.databaseCache.users.set(userID, userData);
        return userData;
      } else {
        userData = new this.usersData({ id: userID });
        await userData.save();
        this.databaseCache.users.set(userID, userData);
        return isLean ? userData.toJSON() : userData;
      }
    }
  }

  convertTime(time, type, noPrefix, locale) {
    if (!type) time = 'to';
    const m = moment(time).locale('UTC');
    return (type === 'to' ? m.toNow(noPrefix) : m.fromNow(noPrefix));
  }

  async resolveUser(search) {
    let user = null;
    if (!search || typeof search !== "string") return;
    // Try ID search
    if (search.match(/^<@!?(\d+)>$/)) {
      const id = search.match(/^<@!?(\d+)>$/)[1];
      user = this.users.fetch(id).catch(() => { });
      if (user) return user;
    }
    // Try username search
    if (search.match(/^!?(\w+)#(\d+)$/)) {
      const username = search.match(/^!?(\w+)#(\d+)$/)[0];
      const discriminator = search.match(/^!?(\w+)#(\d+)$/)[1];
      user = this.users.cache.find((u) => u.username === username && u.discriminator === discriminator);
      if (user) return user;
    }
    if (search.match(/^!?(\w+)$/)) {
      user = this.users.cache.find((u) => u.username.toLowerCase() === search.toLowerCase())
      if (user) return user;
    }
    user = await this.users.fetch(search).catch(() => { });
    return user;
  }

  async resolveMember(search, guild) {
    let member = null;
    if (!search || typeof search !== 'string') return;
    // Try ID search
    if (search.match(/^<@!?(\d+)>$/)) {
      const id = search.match(/^<@!?(\d+)>$/)[1];
      member = await guild.members.fetch(id).catch(() => { });
      if (member) return member;
    }
    // Try username search
    if (search.match(/^!?(\w+)/)) {
      guild = await guild.fetch();
      member = guild.members.cache.find((m) => (m.user.tag.toLowerCase() === search || m.user.username.toLowerCase() === search));
      if (member) return member;
    }
    member = await guild.members.fetch(search).catch(() => { });
    return member;
  }

  async resolveRole(search, guild) {
    let role = null;
    if (!search || typeof search !== 'string') return;
    // Try ID search
    if (search.match(/^<@&!?(\d+)>$/)) {
      const id = search.match(/^<@&!?(\d+)>$/)[1];
      role = guild.roles.cache.get(id);
      if (role) return role;
    }
    // Try name search
    role = guild.roles.cache.find((r) => search === r.name);
    if (role) return role;
    role = guild.roles.cache.get(search);
    return role;
  }
}

module.exports = Comfy;