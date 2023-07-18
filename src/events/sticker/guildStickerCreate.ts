import { LimitFlags, SafeFlags } from "@guard-bot/enums";
import { AuditLogEvent, Events, bold, inlineCode } from "discord.js";

const GuildStickerCreate: Guard.IEvent = {
    name: Events.GuildStickerCreate,
    execute: async (client, [sticker]: Guard.ArgsOf<Events.GuildStickerCreate>) => {
        try {
            const guildData = client.servers.get(sticker.guild.id);
            if (!guildData || !guildData.settings.guard.sticker) return;

            const entry = await sticker.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.StickerCreate, }).then((audit) => audit.entries.first());
            if (!entry || !entry.executor || entry.executor.bot || Date.now() - entry.createdTimestamp > 5000) return;

            const staffMember = sticker.guild.members.cache.get(entry.executorId);
            const safe = [
                ...[staffMember ? client.safes.find((_, k) => staffMember.roles.cache.get(k)) : []],
                ...(client.safes.get(entry.executorId) || [])
            ];
            if (safe.includes(SafeFlags.Full)) return;

            const limit = client.utils.checkLimits({
                userId: entry.executor.id,
                type: LimitFlags.Sticker,
                limit: guildData.settings.guard.stickerLimitCount,
                time: guildData.settings.guard.stickerLimitTime,
                canCheck: safe.includes(SafeFlags.Sticker)
            });
            if (limit) {
                if (sticker.guild.publicUpdatesChannel) {
                    const remainingCount = limit.maxCount - limit.currentCount;
                    const content = `${entry.executor}, ${bold("çıkartma")} limitinde ${inlineCode(limit.maxCount.toString())} hakkından birini kullandığı için uyarıldı. Kalan limit ${inlineCode(remainingCount.toString())}. (${inlineCode(`${limit.currentCount}/${limit.maxCount}`)})`;
                    sticker.guild.publicUpdatesChannel.send({ content });
                }
                return;
            }

            await sticker.delete();

            if (sticker.guild.publicUpdatesChannel) {
                const stickerName = `${sticker.name} (${inlineCode(sticker.id)})`;
                const action = safe.length ? "ekledi limite ulaştı" : "ekledi";
                sticker.guild.publicUpdatesChannel.send(`@everyone ${entry.executor} adlı kullanıcı ${stickerName} adlı çıkartmayı ${action} ve yasaklandı.`);
            }
        } catch (error) {
            console.error("Guild Sticker Create Error:", error);
        }
    },
};

export default GuildStickerCreate;