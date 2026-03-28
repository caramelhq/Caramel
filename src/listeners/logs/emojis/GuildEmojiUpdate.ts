import { Listener } from '@sapphire/framework';
import { Events, type GuildEmoji } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildEmojiUpdateListener extends Listener<typeof Events.GuildEmojiUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildEmojiUpdate
        });
    }

    public async run(oldEmoji: GuildEmoji, newEmoji: GuildEmoji) {
        const changes: string[] = [];

        if (oldEmoji.name !== newEmoji.name) changes.push(`name: ${oldEmoji.name ?? 'None'} -> ${newEmoji.name ?? 'None'}`);

        if (changes.length === 0) return;

        await emitAdvancedLog(newEmoji.guild, 'emojiUpdate', {
            title: 'Emoji Updated',
            fields: [
                { name: 'Emoji', value: `${newEmoji.toString()} (${newEmoji.id})` },
                { name: 'Changes', value: changes.join('\n') }
            ]
        });
    }
}
