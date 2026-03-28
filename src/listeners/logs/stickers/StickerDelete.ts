import { Listener } from '@sapphire/framework';
import { Events, type Sticker } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class StickerDeleteListener extends Listener<typeof Events.GuildStickerDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildStickerDelete
        });
    }

    public async run(sticker: Sticker) {
        if (!sticker.guild) return;

        await emitAdvancedLog(sticker.guild, 'stickerDelete', {
            title: 'Sticker Deleted',
            fields: [
                { name: 'Sticker', value: `${sticker.name} (${sticker.id})` }
            ]
        });
    }
}
