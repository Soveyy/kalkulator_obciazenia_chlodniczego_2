import type { UnconditionedPartitionType } from '../types';

export interface UnconditionedPartitionPreset {
    id: UnconditionedPartitionType;
    label: string;
    areaLabel: string;
    defaultU: number;
    defaultTemperature: number;
}

export const UNCONDITIONED_PARTITION_PRESETS: Record<UnconditionedPartitionType, UnconditionedPartitionPreset> = {
    ceiling_hot_attic: {
        id: 'ceiling_hot_attic',
        label: 'Strop pod gorącym poddaszem',
        areaLabel: 'Powierzchnia stropu',
        defaultU: 0.15,
        defaultTemperature: 50,
    },
    wall_unconditioned_space: {
        id: 'wall_unconditioned_space',
        label: 'Ściana do nieklimatyzowanej przestrzeni',
        areaLabel: 'Powierzchnia netto ściany',
        defaultU: 0.30,
        defaultTemperature: 35,
    },
    floor_unconditioned_space: {
        id: 'floor_unconditioned_space',
        label: 'Podłoga nad nieklimatyzowaną przestrzenią',
        areaLabel: 'Powierzchnia podłogi',
        defaultU: 0.30,
        defaultTemperature: 30,
    },
};

export const UNCONDITIONED_PARTITION_IDS = Object.keys(
    UNCONDITIONED_PARTITION_PRESETS
) as UnconditionedPartitionType[];
