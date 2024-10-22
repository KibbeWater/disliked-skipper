declare namespace PAPITypes {
    declare namespace App {
        type Ready = {};
    }
    declare namespace Shell {
        type LayoutTypeChanged = {
            type: 'immersive' | 'miniplayer' | 'browser';
        };
        type ImmersiveOpened = {};
        type ImmersiveClosed = {};
        type MiniplayerOpened = {};
        type MiniplayerClosed = {};
    }
    declare namespace Music {
        type SetRatingChanged = {
            id: string;
            type: 'library-songs' | 'songs';
            rating: number;
        };
    }
}
