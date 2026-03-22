// ui.ts — Design System for Caramel Components V2

// --- UI Layouts & Components ---

// Container: Container that visually groups a set of components (17)
export const ContainerComponent = (components: any[], accentColor: number = 0xd77655) => ({
    type: 17,
    accent_color: accentColor,
    components
});

// Section: Container to display text alongside an accessory component (9)
// Note: accessory can be a ButtonComponent-like object
export const SectionComponent = (components: any[], accessory?: any) => ({
    type: 9,
    components,
    accessory
});

// ActionRowComponent: Container to display a row of interactive components (1)
export const ActionRowComponent = (components: any[]) => ({ type: 1, components });

// TextDisplayComponent: Markdown text (10) - UNIVERSAL
export const TextDisplayComponent = (content: string) => ({ 
    type: 10, 
    content: (content && content.length > 0) ? content : '\u200B' 
});

// SeparatorComponent: Component to add vertical padding (14)
export const SeparatorComponent = (spacing: number = 1, divider: boolean = true) => ({ 
    type: 14, spacing, divider 
});

// --- Interactive Components (Message) ---

// ButtonComponent: Button object (2)
export const ButtonComponent = (custom_id: string, label: string, style: number, emoji?: any, disabled: boolean = false) => ({
    type: 2, custom_id, label, style, emoji, disabled
});

// StringSelectComponent: (3) - UNIVERSAL
export const StringSelectComponent = (custom_id: string, options: any[], placeholder?: string) => ({
    type: 3, custom_id, options, placeholder
});

// UserSelectComponent: (5) - UNIVERSAL
export const UserSelectComponent = (custom_id: string, placeholder?: string) => ({
    type: 5, custom_id, placeholder
});

// RoleSelectComponent: (6) - UNIVERSAL
export const RoleSelectComponent = (custom_id: string, placeholder?: string) => ({
    type: 6, custom_id, placeholder
});

// MentionableSelectComponent: (7) - UNIVERSAL
export const MentionableSelectComponent = (custom_id: string, placeholder?: string) => ({
    type: 7, custom_id, placeholder
});

// ChannelSelectComponent: (8) - UNIVERSAL
export const ChannelSelectComponent = (custom_id: string, placeholder?: string) => ({
    type: 8, custom_id, placeholder
});

// --- Content Components (Message) ---

// ThumbnailComponent: Small image (11)
export const ThumbnailComponent = (url: string) => ({ type: 11, media: { url } });

// MediaGalleryComponent: Images and media (12)
export const MediaGalleryComponent = (items: any[]) => ({ type: 12, items });

// FileComponent: Displays an attached file (13)
export const FileComponent = (file_url: string) => ({ type: 13, file_url });

// --- Modal Exclusive Components ---

// TextDisplayComponentModal: Markdown text (10)
export const TextDisplayComponentModal = (content: string) => ({ type: 10, content });

// StringSelectComponentModal: (3)
export const StringSelectComponentModal = (custom_id: string, options: any[], placeholder?: string) => ({
    type: 3, custom_id, options, placeholder
});

// UserSelectComponentModal: (5)
export const UserSelectComponentModal = (custom_id: string, placeholder?: string) => ({
    type: 5, custom_id, placeholder
});

// RoleSelectComponentModal: (6)
export const RoleSelectComponentModal = (custom_id: string, placeholder?: string) => ({
    type: 6, custom_id, placeholder
});

// MentionableSelectComponentModal: (7)
export const MentionableSelectComponentModal = (custom_id: string, placeholder?: string) => ({
    type: 7, custom_id, placeholder
});

// ChannelSelectComponentModal: (8)
export const ChannelSelectComponentModal = (custom_id: string, placeholder?: string) => ({
    type: 8, custom_id, placeholder
});

// TextInputComponentModal: Text input object (4)
export const TextInputComponentModal = (custom_id: string, label: string, style: number) => ({
    type: 4, custom_id, label, style
});

// LabelComponentModal: Associating a label and description (18)
export const LabelComponentModal = (label: string, description: string) => ({
    type: 18, label, description
});

// FileUploadComponentModal: (19)
export const FileUploadComponentModal = (custom_id: string) => ({ type: 19, custom_id });

// RadioGroupComponentModal: (21)
export const RadioGroupComponentModal = (custom_id: string, options: any[]) => ({
    type: 21, custom_id, options
});

// CheckboxGroupComponentModal: (22)
export const CheckboxGroupComponentModal = (custom_id: string, checkboxes: any[]) => ({
    type: 22, custom_id, checkboxes
});

// CheckboxComponentModal: (23)
export const CheckboxComponentModal = (custom_id: string, label: string) => ({
    type: 23, custom_id, label
});
