// defaultLayout.ts — Generic single-message layout used for any bot response text
// (errors, validations, info messages, confirmations, etc.)

// Generic single-message card — wraps any plain string into a Components V2 container
export function getMessageLayout(message: string) {
    return {
        flags: 32768,
        components: [
            {
                type: 17,
                components: [{ type: 10, content: message }]
            }
        ]
    };
}

