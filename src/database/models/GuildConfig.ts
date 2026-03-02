import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';


// Guild config model ──────────────────

@Table({
    tableName: 'guild_configs',
    underscored: true,
    timestamps: true
})
export class GuildConfig extends Model {

    @PrimaryKey
    @Column({ type: DataType.STRING, allowNull: false, field: 'guild_id' })
    declare guildId: string;


    // Vanity module fields ──────────

    @Column({ type: DataType.STRING, allowNull: true, field: 'vanity_string' })
    declare vanityString: string | null;

    @Column({ type: DataType.STRING, allowNull: true, field: 'vanity_role_id' })
    declare vanityRoleId: string | null;

    @Column({ type: DataType.STRING, allowNull: true, field: 'vanity_channel_id' })
    declare vanityChannelId: string | null;

    @Column({ type: DataType.STRING, allowNull: true, field: 'vanity_log_channel' })
    declare vanityLogChannel: string | null;

    @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'vanity_module' })
    declare vanityModule: boolean;


    // Moderation module fields ──────────

    @Column({ type: DataType.STRING, allowNull: true, field: 'mod_log_channel_id' })
    declare modLogChannelId: string | null;

    @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'mod_module' })
    declare modModule: boolean;

    @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'mod_thresholds_enabled' })
    declare modThresholdsEnabled: boolean;

    @Column({ type: DataType.STRING, allowNull: true, field: 'muted_role_id' })
    declare mutedRoleId: string | null;

    @Column({ type: DataType.INTEGER, defaultValue: 3, field: 'mute_threshold' })
    declare muteThreshold: number;

    @Column({ type: DataType.INTEGER, defaultValue: 5, field: 'ban_threshold' })
    declare banThreshold: number;

    
    // Modules channels fields ──────────

    @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'vanity_channel_created_by_bot' })
    declare vanityChannelCreatedByBot: boolean;

    @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'vanity_role_created_by_bot' })
    declare vanityRoleCreatedByBot: boolean;

    @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'mod_channel_created_by_bot' })
    declare modChannelCreatedByBot: boolean;

    @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'mod_role_created_by_bot' })
    declare modRoleCreatedByBot: boolean;
}