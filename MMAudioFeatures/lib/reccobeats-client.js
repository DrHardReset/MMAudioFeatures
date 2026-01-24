'use strict';

class AudioFeatures {
    constructor(data) {
        this.id = data.id;
        this.href = data.href;
        this.isrc = data.isrc;
        this.acousticness = data.acousticness;
        this.danceability = data.danceability;
        this.energy = data.energy;
        this.instrumentalness = data.instrumentalness;
        this.key = data.key;
        this.liveness = data.liveness;
        this.loudness = data.loudness;
        this.mode = data.mode;
        this.speechiness = data.speechiness;
        this.tempo = data.tempo;
        this.valence = data.valence;
    }
}

class Artist {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.href = data.href;
    }
}

class Album {
    constructor(data) {
        this.id = data.id;
        this.albumType = data.albumType;
        this.artists = data.artists ? data.artists.map(artist => new Artist(artist)) : [];
        this.totalTracks = data.totalTracks;
        this.href = data.href;
        this.name = data.name;
        this.availableCountries = data.availableCountries;
        this.releaseDate = data.releaseDate;
        this.releaseDateFormat = data.releaseDateFormat;
        this.isrc = data.isrc;
        this.ean = data.ean;
        this.upc = data.upc;
        this.label = data.label;
        this.popularity = data.popularity;
    }
}

class Track {
    constructor(data) {
        this.id = data.id;
        this.trackTitle = data.trackTitle;
        this.artists = data.artists ? data.artists.map(artist => new Artist(artist)) : [];
        this.durationMs = data.durationMs;
        this.isrc = data.isrc;
        this.ean = data.ean;
        this.upc = data.upc;
        this.href = data.href;
        this.availableCountries = data.availableCountries;
        this.popularity = data.popularity;
    }
}

class TrackInfo {
    constructor(data) {
        this.id = data.id;
        this.trackTitle = data.trackTitle;
        this.artists = data.artists ? data.artists.map(artist => new Artist(artist)) : [];
        this.durationMs = data.durationMs;
        this.isrc = data.isrc;
        this.ean = data.ean;
        this.upc = data.upc;
        this.href = data.href;
        this.availableCountries = data.availableCountries;
        this.popularity = data.popularity;
        this.artistInfo = data.artistInfo ? new ArtistInfo(data.artistInfo) : null;
        this.albumInfo = data.albumInfo ? new AlbumInfo(data.albumInfo) : null;
    }
}

class ArtistInfo {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.href = data.href;
    }
}

class AlbumInfo {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.href = data.href;
    }
}

class ReccoBeatsClient {
    constructor() {
        this.baseUrl = 'https://api.reccobeats.com';
        this.apiKey = null;

        // Session cache for better performance
        this._cache = {
            artists: new Map(), // key: artistName -> value: Artist[]
            albums: new Map(),  // key: artistId:albumName -> value: Album[]
        };
    }

    async _fetchFromApi(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {};
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });
            if (!response.ok) {
                throw new Error(`ReccoBeats API error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('ReccoBeats API error:', error);
            throw new Error(`Failed to fetch from ReccoBeats endpoint '${url}': ${error.message}`);
        }
    }

    /**
     * Normalizes a string for comparison by:
     * - Converting to lowercase
     * - Trimming whitespace
     */
    _normalizeForComparison(str) {
        if (!str) {
            return '';
        }

        return str
            .toLowerCase()
            .trim();
    }

    /**
     * Checks if two strings match (case-insensitive, whitespace-insensitive)
     */
    _matchStrings(str1, str2, exact = true) {
        const norm1 = this._normalizeForComparison(str1);
        const norm2 = this._normalizeForComparison(str2);

        if (exact) {
            return norm1 === norm2;
        } else {
            return norm1.includes(norm2) || norm2.includes(norm1);
        }
    }

    /**
     * Helper function to extract the first artist from a semicolon-separated list.
     * MediaMonkey often stores multiple artists as "Artist 1; Artist 2; Artist 3"
     * but ReccoBeats searches work better with single artist names.
     *
     * @param {string} artistString - The artist string, potentially with multiple artists
     * @returns {string} The first artist name, trimmed
     *
     * @example
     * _getFirstArtist("David Guetta; Sia") // returns "David Guetta"
     * _getFirstArtist("Single Artist") // returns "Single Artist"
     */
    _getFirstArtist(artistString) {
        if (!artistString) return '';

        // Split by semicolon and take the first part, then trim whitespace
        const firstArtist = artistString.split(';')[0].trim();

        console.log(`ReccoBeats: Using first artist "${firstArtist}" from "${artistString}"`);
        return firstArtist;
    }

    /**
     * Clears the internal cache. Useful when starting a new search session.
     */
    clearCache() {
        this._cache.artists.clear();
        this._cache.albums.clear();
    }

    /**
     * Searches for artists by name in the ReccoBeats database.
     * Returns all artists that match the search text.
     * Automatically uses only the first artist if multiple artists are provided (separated by semicolon).
     *
     * @param {string} artist - The name of the artist to search for (may contain multiple artists separated by semicolon)
     * @param {boolean} [exactMatch=false] - If true, returns only artists with exact name match
     * @returns {Promise<Artist[]>} Array of Artist objects
     * @throws {Error} When artist name is missing or no artists found
     *
     * @example
     * const allArtists = await client.searchArtist('Headhunterz');
     * const exactMatches = await client.searchArtist('Headhunterz', true);
     * const multipleArtists = await client.searchArtist('David Guetta; Sia', true); // Will search for "David Guetta"
     */
    async searchArtist(artist, exactMatch = true) {
        if (!artist) {
            throw new Error('Artist name is required');
        }

        // Use only the first artist for ReccoBeats searches
        const firstArtist = this._getFirstArtist(artist);
        if (!firstArtist) {
            throw new Error('No valid artist name found');
        }

        // Check cache first
        const cacheKey = `${firstArtist}:${exactMatch}`;
        if (this._cache.artists.has(cacheKey)) {
            console.log(`ReccoBeats: Using cached artist results for "${firstArtist}"`);
            return this._cache.artists.get(cacheKey);
        }

        // Not in cache, do the search
        const allArtists = [];
        let page = 0;
        const size = 50;

        // Collect all artists from all pages
        while (true) {
            const data = await this._fetchFromApi(`/v1/artist/search?searchText=${encodeURIComponent(firstArtist)}&page=${page}&size=${size}`);

            if (!data.content || !Array.isArray(data.content)) {
                break;
            }

            allArtists.push(...data.content);

            // Check if we've reached the end of results
            if (page >= data.totalPages - 1 || data.content.length < size) {
                break;
            }

            page++;
        }

        // Filter for exact matches if requested
        const results = exactMatch ? allArtists.filter(a => this._matchStrings(a.name, firstArtist, true)) : allArtists;

        if (results.length === 0) {
            const matchType = exactMatch ? 'exact match' : 'search results';
            throw new Error(`Artist '${firstArtist}' not found in ReccoBeats (${matchType}).`);
        }

        const artistObjects = results.map(artistData => new Artist(artistData));

        // Cache the results before returning
        this._cache.artists.set(cacheKey, artistObjects);

        return artistObjects;
    }

    /**
 * Searches for albums by artist ID and album name.
 * Returns all matching albums (there can be multiple editions/versions).
 * Results are cached for performance.
 *
 * @param {string} artistId - The ReccoBeats ID of the artist
 * @param {string} album - The name of the album
 * @returns {Promise<Album[]>} Array of Album objects
 * @throws {Error} When required parameters are missing or no albums found
 */
    async searchArtistAlbum(artistId, album) {
        if (!artistId || !album) {
            throw new Error('Artist id and album are required');
        }

        // Check cache first
        const cacheKey = `${artistId}:${album}`;
        if (this._cache.albums.has(cacheKey)) {
            console.log(`ReccoBeats: Using cached album results for artist ${artistId}, album "${album}"`);
            return this._cache.albums.get(cacheKey);
        }

        // Not in cache, do the search
        let page = 0;
        const size = 50;
        const matchingAlbums = [];

        while (true) {
            const albumData = await this._fetchFromApi(`/v1/artist/${encodeURIComponent(artistId)}/album?page=${page}&size=${size}`);

            if (!albumData.content || !Array.isArray(albumData.content)) {
                break;
            }

            const foundAlbums = albumData.content.filter(a =>
                this._matchStrings(a.name, album, true)
            );

            matchingAlbums.push(...foundAlbums);

            if (page >= albumData.totalPages - 1 || albumData.content.length < size) {
                break;
            }

            page++;
        }

        if (matchingAlbums.length === 0) {
            throw new Error(`Album '${album}' not found for artist ID '${artistId}' in ReccoBeats.`);
        }

        // Convert to Album objects
        const albumObjects = matchingAlbums.map(albumData => new Album(albumData));

        // Cache the results before returning
        this._cache.albums.set(cacheKey, albumObjects);

        return albumObjects;
    }

    /**
     * Searches for a track by artist name across all albums of the artist.
     * This function is unprecise by design because it returns the first matching track on any album,
     * which may not be the correct one if multiple tracks with the same name or multiple editions of an album exist.
     * Automatically uses only the first artist if multiple artists are provided (separated by semicolon).
     *
     * @param {string} artist - The name of the artist (may contain multiple artists separated by semicolon)
     * @param {string} track - The name of the track
     * @returns {Promise<Track>} Track object
     * @throws {Error} When required parameters are missing or when the track is not found
     */
    async searchArtistTrack(artist, track) {
        if (!artist || !track) {
            throw new Error('Artist name and track are required');
        }

        // Use only the first artist for ReccoBeats searches
        const firstArtist = this._getFirstArtist(artist);
        if (!firstArtist) {
            throw new Error('No valid artist name found');
        }

        // Find all artists with exact name match using the searchArtist function
        const matchingArtists = await this.searchArtist(firstArtist, true);

        // Search for the track in each matching artist
        for (const foundArtist of matchingArtists) {
            let page = 0;
            const size = 50;

            while (true) {
                const trackData = await this._fetchFromApi(`/v1/artist/${encodeURIComponent(foundArtist.id)}/track?page=${page}&size=${size}`);

                if (!trackData.content || !Array.isArray(trackData.content)) {
                    break;
                }

                const foundTrack = trackData.content.find(t =>
                    this._matchStrings(t.trackTitle, track, true)
                );

                if (foundTrack) {
                    return new Track(foundTrack);
                }

                if (page >= trackData.totalPages - 1 || trackData.content.length < size) {
                    break;
                }

                page++;
            }
        }

        throw new Error(`Track '${track}' not found for any artist named '${firstArtist}' in ReccoBeats.`);
    }

    /**
     * Search for a track by artist name, album name and track name.
     * This provides the most precise search by narrowing down to a specific album.
     * Searches all artists with matching name and all albums with matching name.
     * Results are cached for performance - repeated searches for the same artist/album are fast.
     * Automatically uses only the first artist if multiple artists are provided (separated by semicolon).
     *
     * @param {string} artist - The name of the artist (may contain multiple artists separated by semicolon)
     * @param {string} album - The name of the album
     * @param {string} track - The name of the track
     * @returns {Promise<TrackInfo>} TrackInfo object with artist and album information
     * @throws {Error} When required parameters are missing or when the track is not found
     *
     * @example
     * // Basic search with album for better accuracy
     * const track = await client.searchArtistAlbumTrack('Goldfish', 'Late Night People', 'If I Could Find');
     * console.log(track.trackTitle); // "If I Could Find"
     * console.log(track.artistInfo.name); // "Goldfish"
     * console.log(track.albumInfo.name); // "Late Night People"
     *
     * @example
     * // Works with multiple artists (uses first one)
     * const track = await client.searchArtistAlbumTrack('David Guetta; Sia', 'Nothing But The Beat', 'Titanium');
     * // Will search for "David Guetta"
     */
    async searchArtistAlbumTrack(artist, album, track) {
        if (!artist || !album || !track) {
            throw new Error('Artist name, album and track are required');
        }

        const firstArtist = this._getFirstArtist(artist);
        if (!firstArtist) {
            throw new Error('No valid artist name found');
        }

        // Use searchArtist directly - it now has caching built-in
        const matchingArtists = await this.searchArtist(firstArtist, true);

        for (const foundArtist of matchingArtists) {
            // Use searchArtistAlbum directly - it now has caching built-in
            try {
                const matchingAlbums = await this.searchArtistAlbum(foundArtist.id, album);

                // Search for track in each matching album
                for (const foundAlbum of matchingAlbums) {
                    let trackPage = 0;
                    const trackSize = 50;

                    while (true) {
                        const trackData = await this._fetchFromApi(`/v1/album/${encodeURIComponent(foundAlbum.id)}/track?page=${trackPage}&size=${trackSize}`);

                        if (!trackData.content || !Array.isArray(trackData.content)) {
                            break;
                        }

                        const foundTrack = trackData.content.find(t =>
                            this._matchStrings(t.trackTitle, track, true)
                        );

                        if (foundTrack) {
                            return new TrackInfo({
                                ...foundTrack,
                                artistInfo: {
                                    id: foundArtist.id,
                                    name: foundArtist.name,
                                    href: foundArtist.href
                                },
                                albumInfo: {
                                    id: foundAlbum.id,
                                    name: foundAlbum.name,
                                    href: foundAlbum.href
                                }
                            });
                        }

                        if (trackPage >= trackData.totalPages - 1 || trackData.content.length < trackSize) {
                            break;
                        }

                        trackPage++;
                    }
                }
            } catch (error) {
                // Album not found for this artist, continue with next artist
                console.log(`ReccoBeats: Album '${album}' not found for artist '${foundArtist.name}', trying next artist...`);
                continue;
            }
        }

        throw new Error(`Track '${track}' not found in any album named '${album}' by any artist named '${firstArtist}' in ReccoBeats.`);
    }

    /**
     * Unified search function for tracks with optional album parameter.
     * Automatically routes to the appropriate search method based on parameters.
     * Automatically uses only the first artist if multiple artists are provided (separated by semicolon).
     *
     * @param {string} artist - Artist name (may contain multiple artists separated by semicolon)
     * @param {string} track - Track name
     * @param {string|null} [album=null] - Optional album name
     * @returns {Promise<Track|TrackInfo>} Track object (with album info if album provided)
     * @throws {Error} When required parameters are missing or track not found
     *
     * @example
     * // Search without album
     * const track1 = await client.searchTracks('Headhunterz', 'Orange Heart');
     *
     * // Search with album for better accuracy
     * const track2 = await client.searchTracks('Headhunterz', 'Orange Heart', 'Orange Heart');
     */
    async searchTracks(artist, track, album = null) {
        if (!artist || !track) {
            throw new Error('Artist name and track name are required');
        }

        // If album is provided, use the more specific search
        if (album) {
            return await this.searchArtistAlbumTrack(artist, album, track);
        }

        // Otherwise use the simpler artist+track search
        return await this.searchArtistTrack(artist, track);
    }

    /**
     * Fetches audio features for multiple tracks by ReccoBeats or Spotify IDs.
     * Automatically chunks large batches into multiple requests (max 40 IDs per request).
     * Always accepts and returns arrays for consistent API.
     *
     * @param {string[]} reccoOrSpotifyIds - Array of ReccoBeats or Spotify ID strings
     * @returns {Promise<(AudioFeatures|null)[]>} Array of AudioFeatures objects (null for not found)
     * @throws {Error} When input is not an array or empty
     */
    async getAudioFeaturesByReccoOrSpotifyIds(reccoOrSpotifyIds) {
        if (!Array.isArray(reccoOrSpotifyIds)) {
            throw new Error('Array of IDs is required');
        }

        if (reccoOrSpotifyIds.length === 0) {
            return [];
        }

        const allResults = [];
        const maxChunkSize = 40;

        // Process in chunks of up to 40 IDs
        for (let i = 0; i < reccoOrSpotifyIds.length; i += maxChunkSize) {
            const chunk = reccoOrSpotifyIds.slice(i, i + maxChunkSize);
            const idsParam = chunk.join(',');

            try {
                const data = await this._fetchFromApi(`/v1/audio-features?ids=${encodeURIComponent(idsParam)}`);

                // Maintain order: map each requested ID to its result
                const orderedResults = chunk.map(requestedId => {
                    const match = (data.content || []).find(result =>
                        result && (
                            result.id === requestedId ||
                            (result.href && result.href.includes(requestedId))
                        )
                    );
                    return match ? new AudioFeatures(match) : null;
                });

                allResults.push(...orderedResults);

            } catch (error) {
                console.error(`Chunk error for IDs ${chunk.join(',')}:`, error);
                // Add nulls for failed chunk to maintain array length
                allResults.push(...new Array(chunk.length).fill(null));
            }
        }

        return allResults;
    }

    /**
     * Fetches audio features for a track by ReccoBeats ID.
     *
     * @param {string} reccobeatsId - The ReccoBeats ID of the track
     * @returns {Promise<AudioFeatures>} AudioFeatures object
     * @throws {Error} When ReccoBeats ID is missing
     */
    async getAudioFeatures(reccobeatsId) {
        if (!reccobeatsId) {
            throw new Error('ReccoBeats ID is required');
        }

        const data = await this._fetchFromApi(`/v1/track/${encodeURIComponent(reccobeatsId)}/audio-features`);
        return new AudioFeatures(data);
    }

    /**
     * Generates a ReccoBeats track API URL from a track ID.
     *
     * @param {string} trackId - The ReccoBeats track ID
     * @returns {string} The complete ReccoBeats track API URL
     * @throws {Error} When track ID is missing
     *
     * @example
     * const url = client.getTrackUrl('eb5f88c9-107a-4839-a18e-aa068184beaa');
     * // Returns: 'https://api.reccobeats.com/v1/track/eb5f88c9-107a-4839-a18e-aa068184beaa'
     */
    getTrackUrl(trackId) {
        if (!trackId) {
            throw new Error('Track ID is required');
        }
        return `${this.baseUrl}/v1/track/${trackId}`;
    }

    /**
     * Generates a ReccoBeats audio features API URL from a track ID.
     *
     * @param {string} trackId - The ReccoBeats track ID
     * @returns {string} The complete ReccoBeats audio features API URL
     * @throws {Error} When track ID is missing
     *
     * @example
     * const url = client.getAudioFeaturesUrl('eb5f88c9-107a-4839-a18e-aa068184beaa');
     * // Returns: 'https://api.reccobeats.com/v1/track/eb5f88c9-107a-4839-a18e-aa068184beaa/audio-features'
     */
    getAudioFeaturesUrl(trackId) {
        if (!trackId) {
            throw new Error('Track ID is required');
        }
        return `${this.baseUrl}/v1/track/${trackId}/audio-features`;
    }
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ReccoBeatsClient,
        AudioFeatures,
        Artist,
        Album,
        Track,
        TrackInfo,
        ArtistInfo,
        AlbumInfo
    };
} else {
    // For browser/MediaMonkey environments
    window.ReccoBeatsClient = ReccoBeatsClient;
    window.AudioFeatures = AudioFeatures;
    window.Artist = Artist;
    window.Album = Album;
    window.Track = Track;
    window.TrackInfo = TrackInfo;
    window.ArtistInfo = ArtistInfo;
    window.AlbumInfo = AlbumInfo;
}