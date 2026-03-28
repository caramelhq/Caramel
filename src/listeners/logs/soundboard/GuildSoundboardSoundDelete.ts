import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildSoundboardSoundDeleteListener extends Listener<typeof Events.GuildSoundboardSoundDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildSoundboardSoundDelete
        });
    }

    public async run(sound: any) {
        await emitAdvancedLog(sound.guild, 'soundboardSoundDelete', {
            title: 'Soundboard Sound Deleted',
            fields: [
                { name: 'Sound', value: `${sound.name ?? 'Unknown'} (${sound.id ?? 'Unknown'})` }
            ]
        });
    }
}
