import { useMusicKit } from '../api/MusicKit';
import { useConfig } from '../config';

type Cached<T> = { value: T; cache_date: number };
type RATING_STATE = 'liked' | 'disliked' | 'unrated';
type Rating = { song: string; rating: RATING_STATE };

const ratings_cache: Record<string, Cached<Rating>> = {};
export function fetchRatings(songs: string[], ignoreCache: boolean = false): Promise<Record<string, Rating>> {
    const uncached = ignoreCache ? songs : _filterUncached(songs);
    const cached = songs.filter((song) => !uncached.includes(song));
    if (uncached.length === 0)
        return Promise.resolve(Object.fromEntries(cached.map((song) => [song, ratings_cache[song].value])));

    return new Promise((resolve, reject) => {
        _fetchRatings(uncached)
            .then((ratings) => {
                const fetchedRatings = ratings.map(_transformRating);
                const missingRatings = uncached
                    .filter((song) => !fetchedRatings.some((rating) => rating.song === song))
                    .map((song): Rating => ({ song, rating: 'unrated' }));
                const allRatings = fetchedRatings.concat(missingRatings);

                _storeRatings(allRatings);
                resolve(
                    Object.fromEntries(
                        allRatings
                            .concat(cached.map((song) => ratings_cache[song].value))
                            .map((rating) => [rating.song, rating]),
                    ),
                );
            })
            .catch(reject);
    });
}

const _transformRating = (rating: _rating): Rating => ({
    song: rating.id,
    rating: rating.attributes.value === 1 ? 'liked' : 'disliked',
});

const _filterUncached = (songs: string[]) =>
    songs.filter((song) => !ratings_cache[song] || !isCachedItemValid(ratings_cache[song]));
const _storeRatings = (ratings: Rating[]) =>
    ratings.forEach((rating) => (ratings_cache[rating.song] = { value: rating, cache_date: Date.now() }));

// const CACHE_LIFETIME = 1000 * 60 * 60 * 1; // 1 hour
const isCachedItemValid = (item: Cached<Rating>) =>
    Date.now() - item.cache_date < 1000 * 60 * useConfig().cacheDuration && useConfig().enableCache;

type _rating = {
    attributes: {
        value: number;
    };
    href: string;
    id: string;
};
async function _fetchRatings(songs: string[]) {
    const ratings = await _musicAPIRequest<{ data: _rating[] }>(`/v1/me/ratings/songs?ids=${songs.join(',')}`);
    return ratings.data;
}

const API_URL = 'https://api.music.apple.com';
function _musicAPIRequest<Type>(path: string): Promise<Type> {
    return new Promise((resolve, reject) => {
        const musicKit = useMusicKit();
        fetch(`${API_URL}${path}`, {
            headers: {
                Authorization: `Bearer ${musicKit.developerToken}`,
                'Music-User-Token': musicKit.musicUserToken,
            },
        })
            .then((res) => {
                if (!res.ok) reject(res);
                res.json().then(resolve).catch(reject);
            })
            .catch(reject);
    });
}
