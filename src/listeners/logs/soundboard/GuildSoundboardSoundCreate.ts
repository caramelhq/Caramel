import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildSoundboardSoundCreateListener extends Listener<typeof Events.GuildSoundboardSoundCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildSoundboardSoundCreate
        });
    }

    public async run(sound: any) {
        await emitAdvancedLog(sound.guild, 'soundboardSoundUpload', {
            title: 'Soundboard Sound Uploaded',
            fields: [
                { name: 'Sound', value: `${sound.name ?? 'Unknown'} (${sound.id ?? 'Unknown'})` }
            ]
        });
    }
}
