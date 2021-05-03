import { ActorDataPF2e } from '@actor/data-definitions';
import { ItemDataPF2e, SpellcastingEntryData } from '@item/data/types';
import { tupleHasValue } from '@module/utils';
import { MigrationBase } from './base';

const LEGIT_TRADITIONS = ['arcane', 'divine', 'occult', 'primal', 'focus', 'ritual', 'halcyon'] as const;

interface HighestTradition {
    name: typeof LEGIT_TRADITIONS[number];
    value: number;
}

/**
 * Make something lowercase in a type safe way. At the time of writing,
 * the string class does not properly handle toLowerCase().
 *
 * This could also be solved by declaration merging the string class, but that
 * would pollute all typings in the codebase.
 * @param value
 * @returns
 */
function makeLowercase<T extends string>(value: T): Lowercase<T> {
    return value.toLowerCase() as Lowercase<T>;
}

export class Migration619TraditionLowercaseAndRemoveWandScroll extends MigrationBase {
    static version = 0.619;

    async updateItem(item: ItemDataPF2e, actorData?: ActorDataPF2e) {
        if (!actorData || item.type !== 'spellcastingEntry') {
            return;
        }

        // Convert to lowercase
        item.data.tradition.value = makeLowercase(item.data.tradition.value);

        // Do not change regular spellcasting entries any further
        if (tupleHasValue(LEGIT_TRADITIONS, item.data.tradition.value)) {
            return;
        }

        // Calculate the highest tradition in the actor
        const allEntries = actorData.items.filter(
            (itemData) => itemData.type === 'spellcastingEntry',
        ) as SpellcastingEntryData[];
        const highestTradition = allEntries.reduce<HighestTradition>(
            (prev, current) => {
                if (tupleHasValue(LEGIT_TRADITIONS, current.data.tradition.value)) {
                    const value = current.data.spelldc.value ?? 0;
                    if (value > prev.value) {
                        const name = current.data.tradition.value;
                        return { name, value };
                    }
                }

                return prev;
            },
            { name: 'arcane', value: 0 },
        );

        item.data.tradition.value = highestTradition.name;
    }
}
