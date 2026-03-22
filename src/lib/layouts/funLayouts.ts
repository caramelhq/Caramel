import { Emojis } from '../constants/emojis';
import { ContainerComponent, TextDisplayComponent, MediaGalleryComponent, SeparatorComponent } from './ui';

/**
 * Layout for the /roll command
 */
export function getRollLayout(content: string) {
    return {
        flags: 32768,
        components: [
            ContainerComponent([
                TextDisplayComponent(content)
            ])
        ]
    };
}

/**
 * Layout for the /banana command
 */
export function getBananaLayout(content: string, imageUrl: string, label: string) {
    return {
        flags: 32768,
        components: [
            ContainerComponent([
                TextDisplayComponent(content),
                MediaGalleryComponent([{ media: { url: imageUrl } }]),
                SeparatorComponent(1, false),
                TextDisplayComponent(`-# ${label}`)
            ])
        ]
    };
}
