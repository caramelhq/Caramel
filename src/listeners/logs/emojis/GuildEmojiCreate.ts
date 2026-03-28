import { Listener } from '@sapphire/framework';
import { Events, type GuildEmoji } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildEmojiCreateListener extends Listener<typeof Events.GuildEmojiCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildEmojiCreate
        });
    }

    public async run(emoji: GuildEmoji) {
        await emitAdvancedLog(emoji.guild, 'emojiCreate', {
            title: 'Emoji Created',
            fields: [
                { name: 'Emoji', value: `${emoji.toString()} (${emoji.name ?? 'Unnamed'})` },
                { name: 'ID', value: emoji.id }
            ]
        });
    }
}
