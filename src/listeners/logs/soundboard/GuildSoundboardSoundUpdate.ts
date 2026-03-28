import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildSoundboardSoundUpdateListener extends Listener<typeof Events.GuildSoundboardSoundUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildSoundboardSoundUpdate
        });
    }

    public async run(oldSound: any, newSound: any) {
        if (oldSound.name !== newSound.name) {
            await emitAdvancedLog(newSound.guild, 'soundboardSoundNameUpdate', {
                title: 'Soundboard Sound Renamed',
                fields: [
                    { name: 'Sound', value: `${oldSound.name ?? 'Unknown'} -> ${newSound.name ?? 'Unknown'}` },
                    { name: 'ID', value: newSound.id ?? 'Unknown' }
                ]
            });
        }

        if (oldSound.volume !== newSound.volume) {
            await emitAdvancedLog(newSound.guild, 'soundboardSoundVolumeUpdate', {
                title: 'Soundboard Sound Volume Updated',
                fields: [
                    { name: 'Sound', value: `${newSound.name ?? 'Unknown'} (${newSound.id ?? 'Unknown'})` },
                    { name: 'Volume', value: `${oldSound.volume ?? 'Unknown'} -> ${newSound.volume ?? 'Unknown'}` }
                ]
            });
        }

        if (oldSound.emojiId !== newSound.emojiId || oldSound.emojiName !== newSound.emojiName) {
            await emitAdvancedLog(newSound.guild, 'soundboardSoundEmojiUpdate', {
                title: 'Soundboard Sound Emoji Updated',
                fields: [
                    { name: 'Sound', value: `${newSound.name ?? 'Unknown'} (${newSound.id ?? 'Unknown'})` },
                    { name: 'Emoji', value: `${oldSound.emojiName ?? oldSound.emojiId ?? 'None'} -> ${newSound.emojiName ?? newSound.emojiId ?? 'None'}` }
                ]
            });
        }
    }
}
