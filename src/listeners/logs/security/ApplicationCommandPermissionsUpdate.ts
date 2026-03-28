import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class ApplicationCommandPermissionsUpdateListener extends Listener<typeof Events.ApplicationCommandPermissionsUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.ApplicationCommandPermissionsUpdate
        });
    }

    public async run(data: any) {
        const guild = data.guild;
        if (!guild) return;

        await emitAdvancedLog(guild, 'applicationCommandPermissionsUpdate', {
            title: 'Slash Command Permissions Updated',
            fields: [
                { name: 'Command ID', value: data.id ?? 'Unknown', inline: true },
                { name: 'Application ID', value: data.applicationId ?? 'Unknown', inline: true },
                { name: 'Permissions Entries', value: String(data.permissions?.length ?? 0) }
            ]
        });
    }
}
