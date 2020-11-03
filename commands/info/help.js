const { MessageEmbed } = require('discord.js');
const { readdirSync } = require('fs');
const { stripIndents } = require('common-tags');
const { ownerid } = require('../../botconfig.json');
const GuildConfig = require('../../database/schemas/GuildConfig')

module.exports = {
	config: {
		name: 'help',
		aliases: ['h', 'halp', 'commands'],
		usage: '(command)',
		category: 'info',
		description: 'Displays all available commands',
		accessableby: 'Members',
	},
	run: async (bot, message, args) => {
		let guildConfig = await GuildConfig.findOne({ guildId: message.guild.id })

		const embed = new MessageEmbed()
			.setColor('GREEN')
			.setAuthor(`${message.guild.me.displayName} Help`, message.guild.iconURL)
			.setThumbnail(bot.user.displayAvatarURL());

		if (!args[0]) {
			const categories = readdirSync('./commands/');

			embed.setDescription(
				`These are the avaliable commands for ${message.guild.me.displayName}\nThe bot prefix is: **${guildConfig.prefix}**`
			);
			embed.setFooter(
				`© ${message.guild.me.displayName} | Developed by ${bot.users.cache.get(ownerid).tag} | Total Commands: ${bot.commands.size}`,
				bot.user.displayAvatarURL()
			);

			categories.forEach((category) => {
				const dir = bot.commands.filter((c) => c.config.category === category);
				const capitalise =
					category.slice(0, 1).toUpperCase() + category.slice(1);
				try {
					embed.addField(
						`${capitalise} [${dir.size}]:`,
						dir.map((c) => `\`${c.config.name}\``).join(' ')
					);
				} catch (e) { }
			});

			return message.channel.send(embed);
		} else {
			let command = bot.commands.get(
				bot.aliases.get(args[0].toLowerCase()) || args[0].toLowerCase()
			);
			if (!command)
				return message.channel.send(
					embed
						.setTitle('Invalid Command.')
						.setDescription(
							`Do \`${guildConfig.prefix}help\` for the list of the commands.`
						)
				);
			command = command.config;

			embed.setDescription(stripIndents`The bot's prefix is: \`${guildConfig.prefix}\`\n
            **Command:** ${command.name.slice(0, 1).toUpperCase() + command.name.slice(1)
				}
            **Description:** ${command.description || 'No Description provided.'
				}
            **Usage:** ${command.usage
					? `\`${guildConfig.prefix}${command.name} ${command.usage}\``
					: `\`${guildConfig.prefix}${command.name}\``
				}
            **Accessible by:** ${command.accessableby || 'Members'}
            **Aliases:** ${command.aliases ? command.aliases.join(', ') : 'None'
				}`);
			embed.setFooter(
				`© ${message.guild.me.displayName} | Developed by ${bot.users.cache.get(ownerid).tag}`,
				bot.user.displayAvatarURL()
			);

			return message.channel.send(embed);
		}
	},
};