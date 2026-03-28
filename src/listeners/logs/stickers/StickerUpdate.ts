import { Listener } from '@sapphire/framework';
import { Events, type Sticker } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class StickerUpdateListener extends Listener<typeof Events.GuildStickerUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildStickerUpdate
        });
    }

    public async run(oldSticker: Sticker, newSticker: Sticker) {
        if (!newSticker.guild) return;

        const changes: string[] = [];
        if (oldSticker.name !== newSticker.name) changes.push(`name: ${oldSticker.name} -> ${newSticker.name}`);
        if (oldSticker.description !== newSticker.description) {
            changes.push(`description: ${oldSticker.description ?? 'None'} -> ${newSticker.description ?? 'None'}`);
        }

        if (changes.length === 0) return;

        await emitAdvancedLog(newSticker.guild, 'stickerUpdate', {
            title: 'Sticker Updated',
            fields: [
                { name: 'Sticker', value: `${newSticker.name} (${newSticker.id})` },
                { name: 'Changes', value: changes.join('\n') }
            ]
        });
    }
}
