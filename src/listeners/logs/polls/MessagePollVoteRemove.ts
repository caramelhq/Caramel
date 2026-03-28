import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class MessagePollVoteRemoveListener extends Listener<typeof Events.MessagePollVoteRemove> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessagePollVoteRemove
        });
    }

    public async run(vote: any) {
        const guild = vote?.guild ?? vote?.message?.guild;
        if (!guild) return;

        await emitAdvancedLog(guild, 'pollVotesRemove', {
            title: 'Poll Vote Removed',
            fields: [
                { name: 'User ID', value: vote.userId ?? 'Unknown', inline: true },
                { name: 'Answer ID', value: String(vote.answerId ?? 'Unknown'), inline: true },
                { name: 'Message ID', value: vote.messageId ?? vote.message?.id ?? 'Unknown' }
            ]
        });
    }
}
