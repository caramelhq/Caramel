import { UserError } from '@sapphire/framework';

export class CaramelUserError extends UserError {
    public readonly identifier: string;
    public readonly context: unknown;

    constructor(identifier: string, message?: string, context?: unknown) {
        super({ identifier, message, context });
        this.identifier = identifier;
        this.context = context;
    }
}

/**
 * For unexpected system failures that need full logging
 */
export class CaramelSystemError extends Error {
    public readonly context: unknown;

    constructor(message: string, context?: unknown) {
        super(message);
        this.name = 'CaramelSystemError';
        this.context = context;
    }
}
