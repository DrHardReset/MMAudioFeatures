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
    async searchArtist(artist, exactMatch = false) {
        if (!artist) {
            throw new Error('Artist name is required');
        }

        // Use only the first artist for ReccoBeats searches
        const firstArtist = this._getFirstArtist(artist);
        if (!firstArtist) {
            throw new Error('No valid artist name found');
        }

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
        const results = exactMatch ? allArtists.filter(a => a.name === firstArtist) : allArtists;

        if (results.length === 0) {
            const matchType = exactMatch ? 'exact match' : 'search results';
            throw new Error(`Artist '${firstArtist}' not found in ReccoBeats (${matchType}).`);
        }

        return results.map(artistData => new Artist(artistData));
    }

    /**
     * Searches for an album by artist ID and album name.
     *
     * @param {string} artistId - The ReccoBeats ID of the artist
     * @param {string} album - The name of the album
     * @returns {Promise<Album>} Album object
     * @throws {Error} When required parameters are missing or album not found
     */
    async searchArtistAlbum(artistId, album) {
        if (!artistId || !album) {
            throw new Error('Artist id and album are required');
        }

        let page = 0;
        const size = 50;

        while (true) {
            const data = await this._fetchFromApi(`/v1/artist/${encodeURIComponent(artistId)}/album?page=${page}&size=${size}`);

            if (!data.content || !Array.isArray(data.content)) {
                throw new Error(`Album '${album}' not found for artist ID '${artistId}' in ReccoBeats.`);
            }

            const foundAlbum = data.content.find(a => a.name === album);

            if (foundAlbum) {
                return new Album(foundAlbum);
            }

            if (page >= data.totalPages - 1 || data.content.length < size) {
                break;
            }

            page++;
        }

        throw new Error(`Album '${album}' not found for artist ID '${artistId}' in ReccoBeats.`);
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
                const data = await this._fetchFromApi(`/v1/artist/${encodeURIComponent(foundArtist.id)}/track?page=${page}&size=${size}`);

                if (!data.content || !Array.isArray(data.content)) {
                    break;
                }

                const foundTrack = data.content.find(t => t.trackTitle === track);

                if (foundTrack) {
                    return new Track(foundTrack);
                }

                if (page >= data.totalPages - 1 || data.content.length < size) {
                    break;
                }

                page++;
            }
        }

        throw new Error(`Track '${track}' not found for any artist named '${firstArtist}' in ReccoBeats.`);
    }

    /**
     * Search for a track by artist name, album name and track name.
     * Searches all artists with matching name and all albums with matching name.
     * Automatically uses only the first artist if multiple artists are provided (separated by semicolon).
     *
     * @param {string} artist - The name of the artist (may contain multiple artists separated by semicolon)
     * @param {string} album - The name of the album
     * @param {string} track - The name of the track
     * @returns {Promise<TrackInfo>} TrackInfo object with artist and album information
     * @throws {Error} When required parameters are missing or when the track is not found
     */
    async searchArtistAlbumTrack(artist, album, track) {
        if (!artist || !album || !track) {
            throw new Error('Artist name, album and track are required');
        }

        // Use only the first artist for ReccoBeats searches
        const firstArtist = this._getFirstArtist(artist);
        if (!firstArtist) {
            throw new Error('No valid artist name found');
        }

        // Find all artists with exact name match using the updated searchArtist function
        const matchingArtists = await this.searchArtist(firstArtist, true);

        // Search for the track in each matching artist's albums
        for (const foundArtist of matchingArtists) {
            // Collect all albums with matching name for this artist
            let albumPage = 0;
            const albumSize = 50;
            const matchingAlbums = [];

            while (true) {
                const albumData = await this._fetchFromApi(`/v1/artist/${encodeURIComponent(foundArtist.id)}/album?page=${albumPage}&size=${albumSize}`);

                if (!albumData.content || !Array.isArray(albumData.content)) {
                    break;
                }

                // Find all albums with the matching name (API uses 'name' for albums)
                const foundAlbums = albumData.content.filter(a => a.name === album);
                matchingAlbums.push(...foundAlbums);

                // Check if we've reached the end of albums
                if (albumPage >= albumData.totalPages - 1 || albumData.content.length < albumSize) {
                    break;
                }

                albumPage++;
            }

            // Search for the track in each matching album
            for (const foundAlbum of matchingAlbums) {
                let trackPage = 0;
                const trackSize = 50;

                while (true) {
                    const trackData = await this._fetchFromApi(`/v1/album/${encodeURIComponent(foundAlbum.id)}/track?page=${trackPage}&size=${trackSize}`);

                    if (!trackData.content || !Array.isArray(trackData.content)) {
                        break;
                    }

                    // Look for the track in this album
                    const foundTrack = trackData.content.find(t => t.trackTitle === track);
                    if (foundTrack) {
                        // Add artist and album information to the track result
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

                    // Check if we've reached the end of tracks for this album
                    if (trackPage >= trackData.totalPages - 1 || trackData.content.length < trackSize) {
                        break;
                    }

                    trackPage++;
                }
            }
        }

        throw new Error(`Track '${track}' not found in any album named '${album}' by any artist named '${firstArtist}' in ReccoBeats.`);
    }

    /**
     * Fetches audio features for one or more tracks by ReccoBeats or Spotify ID.
     *
     * @param {string|string[]} reccoOrSpotifyIds - Single ID string or array of ID strings
     * @returns {Promise<AudioFeatures|AudioFeatures[]|null>} AudioFeatures object(s) or null if not found
     * @throws {Error} When ID is missing, empty array provided, or more than 40 IDs in array
     */
    async getAudioFeaturesByReccoOrSpotifyId(reccoOrSpotifyIds) {
        if (!reccoOrSpotifyIds) {
            throw new Error('ReccoBeats ID or Spotify ID is required');
        }

        // Support both single IDs and arrays
        const ids = Array.isArray(reccoOrSpotifyIds) ? reccoOrSpotifyIds : [reccoOrSpotifyIds];

        if (ids.length === 0) {
            throw new Error('At least one ID is required');
        }

        if (ids.length > 40) {
            throw new Error('Maximum 40 IDs allowed per request');
        }

        const idsParam = ids.join(',');
        const data = await this._fetchFromApi(`/v1/audio-features?ids=${encodeURIComponent(idsParam)}`);

        // For backward compatibility: return first element for single ID
        if (!Array.isArray(reccoOrSpotifyIds)) {
            const result = data.content && data.content.length > 0 ? data.content[0] : null;
            return result ? new AudioFeatures(result) : null;
        }

        // For arrays: return all results
        return (data.content || []).map(item => item ? new AudioFeatures(item) : null);
    }

    /**
     * Processes large batches of ReccoBeats or Spotify IDs for audio features by chunking them into smaller requests.
     *
     * @param {string[]} reccoOrSpotifyIds - Array of ReccoBeats or Spotify ID strings
     * @returns {Promise<(AudioFeatures|null)[]>} Array of AudioFeatures objects or nulls for not found
     * @throws {Error} When input is not an array
     */
    async getAudioFeaturesBatch(reccoOrSpotifyIds) {
        if (!Array.isArray(reccoOrSpotifyIds)) {
            throw new Error('Array of IDs is required for batch processing');
        }

        if (reccoOrSpotifyIds.length === 0) {
            return [];
        }

        const allResults = [];
        const maxChunkSize = 40;

        for (let i = 0; i < reccoOrSpotifyIds.length; i += maxChunkSize) {
            const chunk = reccoOrSpotifyIds.slice(i, i + maxChunkSize);

            try {
                // Use the existing method which handles arrays
                const chunkResults = await this.getAudioFeaturesByReccoOrSpotifyId(chunk);

                // Ensure we maintain the order by creating a result array matching the chunk
                const orderedResults = chunk.map(requestedId => {
                    // Try to find matching result by ID or href
                    const match = chunkResults.find(result =>
                        result && (
                            result.id === requestedId ||
                            (result.href && result.href.includes(requestedId))
                        )
                    );
                    return match || null; // null for not found
                });

                allResults.push(...orderedResults);

            } catch (error) {
                console.error(`Batch chunk error for IDs ${chunk.join(',')}:`, error);
                // Add nulls for failed chunk
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