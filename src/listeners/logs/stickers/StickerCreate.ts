import { Listener } from '@sapphire/framework';
import { Events, type Sticker } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class StickerCreateListener extends Listener<typeof Events.GuildStickerCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildStickerCreate
        });
    }

    public async run(sticker: Sticker) {
        if (!sticker.guild) return;

        await emitAdvancedLog(sticker.guild, 'stickerCreate', {
            title: 'Sticker Created',
            fields: [
                { name: 'Sticker', value: `${sticker.name} (${sticker.id})` }
            ]
        });
    }
}
