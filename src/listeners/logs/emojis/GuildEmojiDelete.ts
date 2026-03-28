import { Listener } from '@sapphire/framework';
import { Events, type GuildEmoji } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildEmojiDeleteListener extends Listener<typeof Events.GuildEmojiDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildEmojiDelete
        });
    }

    public async run(emoji: GuildEmoji) {
        await emitAdvancedLog(emoji.guild, 'emojiDelete', {
            title: 'Emoji Deleted',
            fields: [
                { name: 'Emoji', value: `${emoji.name ?? 'Unnamed'} (${emoji.id})` }
            ]
        });
    }
}
