import { SafeFlags } from "@guard-bot/enums";
import { AuditLogEvent, Events, bold } from "discord.js";

const GuildMemberAdd: Guard.IEvent = {
	name: Events.GuildMemberAdd,
	execute: async (client, [member]: Guard.ArgsOf<Events.GuildMemberAdd>) => {
		try {
			if (!member.user.bot) return;

			const guildData = client.servers.get(member.guild.id);
			if (!guildData) return;

			const entry = await member.guild
				.fetchAuditLogs({ limit: 1, type: AuditLogEvent.BotAdd })
				.then((audit) => audit.entries.first());
			if (
				!entry ||
				!entry.executor ||
				entry.executor.bot ||
				Date.now() - entry.createdTimestamp > 5000
			)
				return;

			const staffMember = member.guild.members.cache.get(
				entry.executorId,
			);
			const safe = [
				...[
					staffMember
						? client.safes.find((_, k) =>
								staffMember.roles.cache.get(k),
						  )
						: [],
				],
				...(client.safes.get(entry.executorId) || []),
			];
			if (safe.includes(SafeFlags.Full)) return;

			await member.guild.members.ban(entry.executor.id, {
				reason: "Koruma!",
			});
			await client.utils.closePermissions();
			await client.utils.setDanger(member.guild.id, true);
			await member.guild.members.ban(member.id, { reason: "Koruma!" });

			if (member.guild.publicUpdatesChannel) {
				const userName = bold(member.user.tag);
				const action = safe.length ? "ekledi limite ulaştı" : "ekledi";
				member.guild.publicUpdatesChannel.send(
					`@everyone ${entry.executor} adlı kullanıcı ${userName} adlı botu ${action} ve yasaklandı.`,
				);
			}
		} catch (error) {
			console.error("Guild Member Add Error:", error);
		}
	},
};

export default GuildMemberAdd;
